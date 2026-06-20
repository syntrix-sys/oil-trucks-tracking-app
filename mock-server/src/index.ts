import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import {
  SeedData,
  SeedFrame,
  StatusResponse,
  TelemetryBatchMessage,
  Vehicle,
} from "@oiltrack/types";
import { VEHICLE_DEFS } from "./vehicles";

const WS_PORT = parseInt(process.env.PORT || process.env.WS_PORT || "8080", 10);
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || "2000", 10);
const SEED_FILE = process.env.SEED_FILE || path.join(__dirname, "seed-data.json");

console.log(`Loading seed data from ${SEED_FILE}...`);
const seedData: SeedData = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
console.log(`Loaded ${seedData.totalTicks} ticks for ${Object.keys(seedData.vehicles).length} vehicles.`);

// Augment seed vehicles with new fields from VEHICLE_DEFS (CNIC, chassis, trip dates, etc.)
const defMap = new Map(VEHICLE_DEFS.map((d) => [d.id, d]));
const augmentedVehicles: Record<string, Vehicle> = {};
for (const [id, vehicle] of Object.entries(seedData.vehicles)) {
  const def = defMap.get(id);
  augmentedVehicles[id] = {
    ...vehicle,
    chassisNumber: def?.chassisNumber,
    numberOfWheels: def?.numberOfWheels,
    cnic: def?.cnic,
    tripStartDate: def?.tripStartDate,
    tripEndDate: def?.tripEndDate,
    driver: {
      ...vehicle.driver,
      cnicNumber: def?.driver.cnicNumber,
      fatherName: def?.driver.fatherName,
      permanentAddress: def?.driver.permanentAddress,
    },
  };
}

// Registered drivers: cnicNumber → RegisteredDriver
interface RegisteredDriver {
  id: string;
  cnicNumber: string;
  name: string;
  phone: string;
  licenseNumber: string;
  fatherName: string;
  permanentAddress: string;
  vehicleId: string;
  registeredAt: string;
}
const registeredDrivers = new Map<string, RegisteredDriver>();

// Pre-seed from VEHICLE_DEFS so existing drivers can authenticate immediately
for (const def of VEHICLE_DEFS) {
  if (def.driver.cnicNumber) {
    registeredDrivers.set(def.driver.cnicNumber, {
      id: def.driver.id,
      cnicNumber: def.driver.cnicNumber,
      name: def.driver.name,
      phone: def.driver.phone,
      licenseNumber: def.driver.licenseNumber,
      fatherName: def.driver.fatherName ?? "",
      permanentAddress: def.driver.permanentAddress ?? "",
      vehicleId: def.id,
      registeredAt: new Date().toISOString(),
    });
  }
}

// In-memory weight overrides from mobile app: vehicleId → cargoLitres
const weightOverrides = new Map<string, number>();

// Active panic alerts: vehicleId → { alertId, driverName, location, timestamp }
interface PanicRecord { alertId: string; driverName: string; location: { lat: number; lng: number } | null; timestamp: string; }
const panicAlerts = new Map<string, PanicRecord>();

// Load history: vehicleId → LoadEntry[] (latest first, capped at 50)
interface LoadEntry { id: string; vehicleId: string; timestamp: string; totalLiters: number; note?: string; syncedFromMobile: boolean; }
const loadHistory = new Map<string, LoadEntry[]>();
const LOAD_HISTORY_MAX = 50;

let currentTick = 0;
let sessionStartTime = Date.now();
let complete = false;

function rewriteTimestamps<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => rewriteTimestamps(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if ((key === "timestamp" || key === "triggeredAt") && typeof v === "string") {
        const offsetMs = Date.parse(v);
        out[key] = new Date(sessionStartTime + offsetMs).toISOString();
      } else {
        out[key] = rewriteTimestamps(v);
      }
    }
    return out as unknown as T;
  }
  return value;
}

function buildTelemetryBatch(frame: SeedFrame): TelemetryBatchMessage {
  const frames = rewriteTimestamps(frame.data);

  // Inject weight overrides from mobile app
  for (const [vehicleId, litres] of weightOverrides) {
    const f = frames[vehicleId];
    if (f) {
      f.weight = { ...f.weight, cargoLitres: litres };
    }
  }

  return { type: "TELEMETRY_BATCH", tick: frame.tick, frames };
}

function broadcast(message: unknown) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

function dispatchTick() {
  if (currentTick >= seedData.totalTicks) {
    if (!complete) {
      complete = true;
      console.log("Demo session complete.");
    }
    return;
  }

  const frame = seedData.frames[currentTick];
  broadcast(buildTelemetryBatch(frame));

  if (frame.driverAlerts) {
    for (const alert of frame.driverAlerts) {
      console.log(`DRIVER_ALERT: ${alert.vehicleId} ${alert.alertType}`);
      broadcast(alert);
    }
  }

  console.log(`Tick ${currentTick}/${seedData.totalTicks - 1} dispatched`);
  currentTick++;
}

function resetSession() {
  currentTick = 0;
  sessionStartTime = Date.now();
  complete = false;
  weightOverrides.clear();
  console.log("Session reset to tick 0.");
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    const elapsedSeconds = currentTick * seedData.tickIntervalSeconds;
    const remainingSeconds = (seedData.totalTicks - currentTick) * seedData.tickIntervalSeconds;
    const status: StatusResponse = { tick: currentTick, totalTicks: seedData.totalTicks, elapsedSeconds, remainingSeconds };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(status));
    return;
  }

  if (req.method === "GET" && req.url === "/vehicles") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(augmentedVehicles));
    return;
  }

  if (req.method === "POST" && req.url === "/reset") {
    resetSession();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, tick: currentTick }));
    return;
  }

  // Mobile app weight sync: POST /vehicle/:id/weight  body: { liters: number }
  const weightMatch = req.method === "POST" && req.url?.match(/^\/vehicle\/([^/]+)\/weight$/);
  if (weightMatch) {
    const vehicleId = weightMatch[1];
    try {
      const body = await readBody(req);
      const { liters } = JSON.parse(body) as { liters: number };
      if (typeof liters !== "number" || liters < 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid liters value" }));
        return;
      }
      weightOverrides.set(vehicleId, liters);
      // Broadcast weight update to all web clients
      broadcast({ type: "WEIGHT_UPDATE", vehicleId, cargoLitres: liters, updatedAt: new Date().toISOString() });
      console.log(`Weight override: ${vehicleId} → ${liters} L`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, vehicleId, cargoLitres: liters }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  // POST /vehicle/:id/load — mobile submits a new load entry
  const loadMatch = req.method === "POST" && req.url?.match(/^\/vehicle\/([^/]+)\/load$/);
  if (loadMatch) {
    const vehicleId = loadMatch[1];
    try {
      const body = await readBody(req);
      const { totalLiters, note } = JSON.parse(body) as { totalLiters: number; note?: string };
      if (typeof totalLiters !== "number" || totalLiters < 0) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid totalLiters" }));
        return;
      }
      const entry: LoadEntry = {
        id: `LOAD-${vehicleId}-${Date.now()}`,
        vehicleId,
        timestamp: new Date().toISOString(),
        totalLiters,
        note: note?.trim() || undefined,
        syncedFromMobile: true,
      };
      const history = loadHistory.get(vehicleId) ?? [];
      history.unshift(entry);
      if (history.length > LOAD_HISTORY_MAX) history.pop();
      loadHistory.set(vehicleId, history);
      // Also update the weight override so telemetry reflects the new load
      weightOverrides.set(vehicleId, totalLiters);
      broadcast({ type: "LOAD_UPDATE", vehicleId, entry });
      broadcast({ type: "WEIGHT_UPDATE", vehicleId, cargoLitres: totalLiters, updatedAt: entry.timestamp });
      console.log(`Load entry: ${vehicleId} → ${totalLiters} L${note ? ` (${note})` : ""}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, entry }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  // GET /vehicle/:id/load/history — returns last 50 load entries
  const loadHistoryMatch = req.method === "GET" && req.url?.match(/^\/vehicle\/([^/]+)\/load\/history$/);
  if (loadHistoryMatch) {
    const vehicleId = loadHistoryMatch[1];
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(loadHistory.get(vehicleId) ?? []));
    return;
  }

  // Panic alert: POST /vehicle/:id/panic
  const panicMatch = req.method === "POST" && req.url?.match(/^\/vehicle\/([^/]+)\/panic$/);
  if (panicMatch) {
    const vehicleId = panicMatch[1];
    try {
      const body = await readBody(req);
      const { driverName, location } = JSON.parse(body) as { driverName: string; location: { lat: number; lng: number } | null };
      const alertId = `PANIC-${vehicleId}-${Date.now()}`;
      const timestamp = new Date().toISOString();
      const record: PanicRecord = { alertId, driverName, location: location ?? null, timestamp };
      panicAlerts.set(vehicleId, record);
      broadcast({ type: "PANIC_ALERT", alertId, vehicleId, driverName, location: location ?? null, timestamp });
      console.log(`PANIC ALERT: ${vehicleId} — ${driverName}`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, alertId }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  // Cancel panic: POST /vehicle/:id/panic/cancel
  const panicCancelMatch = req.method === "POST" && req.url?.match(/^\/vehicle\/([^/]+)\/panic\/cancel$/);
  if (panicCancelMatch) {
    const vehicleId = panicCancelMatch[1];
    const record = panicAlerts.get(vehicleId);
    panicAlerts.delete(vehicleId);
    broadcast({ type: "PANIC_CANCELLED", vehicleId, alertId: record?.alertId ?? "" });
    console.log(`Panic cancelled: ${vehicleId}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // POST /vehicles/add — register a new vehicle in the in-memory fleet
  if (req.method === "POST" && req.url === "/vehicles/add") {
    try {
      const body = await readBody(req);
      const payload = JSON.parse(body) as {
        registrationNumber: string; chassisNumber?: string;
        make: string; model: string; year: number;
        numberOfWheels?: number; tankCapacityLitres: number;
        emptyWeightKg: number; maxGrossWeightKg: number; maxSpeedKmh?: number;
        origin?: string; destination?: string;
        tripStartDate?: string; tripEndDate?: string;
        cnic?: string;
      };
      if (!payload.registrationNumber || !payload.make || !payload.model || !payload.year
          || !payload.tankCapacityLitres || !payload.emptyWeightKg || !payload.maxGrossWeightKg) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields" }));
        return;
      }
      // Generate next vehicle ID
      const existing = Object.keys(augmentedVehicles);
      const maxNum   = existing.reduce((max, id) => {
        const n = parseInt(id.replace("TRK-", ""), 10);
        return isNaN(n) ? max : Math.max(max, n);
      }, 0);
      const newId = `TRK-${String(maxNum + 1).padStart(3, "0")}`;
      if (augmentedVehicles[newId]) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Vehicle ID conflict, try again" }));
        return;
      }
      const now = new Date().toISOString();
      const vehicle: Vehicle = {
        id: newId,
        registrationNumber: payload.registrationNumber.trim(),
        chassisNumber: payload.chassisNumber?.trim(),
        make: payload.make.trim(),
        model: payload.model.trim(),
        year: payload.year,
        numberOfWheels: payload.numberOfWheels,
        tankCapacityLitres: payload.tankCapacityLitres,
        emptyWeightKg: payload.emptyWeightKg,
        maxGrossWeightKg: payload.maxGrossWeightKg,
        maxSpeedKmh: payload.maxSpeedKmh ?? 90,
        cnic: payload.cnic?.trim(),
        tripStartDate: payload.tripStartDate ?? now,
        tripEndDate: payload.tripEndDate,
        status: "stopped",
        driver: {
          id: `DRV-${newId}`,
          name: "Unassigned",
          licenseNumber: "—",
          phone: "—",
          onDutySince: now,
        },
        route: {
          id: `RT-${newId}`,
          name: payload.origin && payload.destination ? `${payload.origin} → ${payload.destination}` : "Not Set",
          waypoints: [],
          origin: payload.origin ?? "—",
          destination: payload.destination ?? "—",
          estimatedArrival: payload.tripEndDate ?? now,
        },
        imageUrl: undefined,
      };
      augmentedVehicles[newId] = vehicle;
      console.log(`Vehicle added: ${newId} — ${payload.make} ${payload.model} (${payload.registrationNumber})`);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, vehicle }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  // GET /drivers — list all registered drivers
  if (req.method === "GET" && req.url === "/drivers") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(Array.from(registeredDrivers.values())));
    return;
  }

  // POST /drivers/register — register a new driver
  if (req.method === "POST" && req.url === "/drivers/register") {
    try {
      const body = await readBody(req);
      const { cnicNumber, name, phone, licenseNumber, fatherName, permanentAddress, vehicleId } =
        JSON.parse(body) as Partial<RegisteredDriver>;
      if (!cnicNumber || !name || !phone || !licenseNumber || !vehicleId) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Missing required fields: cnicNumber, name, phone, licenseNumber, vehicleId" }));
        return;
      }
      if (!/^\d{5}-\d{7}-\d$/.test(cnicNumber)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid CNIC format. Expected XXXXX-XXXXXXX-X" }));
        return;
      }
      if (registeredDrivers.has(cnicNumber)) {
        res.writeHead(409, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "A driver with this CNIC is already registered" }));
        return;
      }
      const driver: RegisteredDriver = {
        id: `DRV-${Date.now()}`,
        cnicNumber,
        name: name.trim(),
        phone: phone.trim(),
        licenseNumber: licenseNumber.trim(),
        fatherName: (fatherName ?? "").trim(),
        permanentAddress: (permanentAddress ?? "").trim(),
        vehicleId,
        registeredAt: new Date().toISOString(),
      };
      registeredDrivers.set(cnicNumber, driver);
      console.log(`Driver registered: ${name} (${cnicNumber}) → ${vehicleId}`);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, driver }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  // POST /drivers/auth — validate CNIC, return session for mobile login
  if (req.method === "POST" && req.url === "/drivers/auth") {
    try {
      const body = await readBody(req);
      const { cnicNumber } = JSON.parse(body) as { cnicNumber: string };
      const driver = cnicNumber ? registeredDrivers.get(cnicNumber) : undefined;
      if (!driver) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "CNIC not registered" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        ok: true,
        session: {
          cnicNumber: driver.cnicNumber,
          name: driver.name,
          vehicleId: driver.vehicleId,
          phone: driver.phone,
        },
      }));
    } catch {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad request" }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log(`Client connected (${wss.clients.size} total)`);

  if (currentTick > 0 || currentTick < seedData.totalTicks) {
    const lastTick = Math.min(currentTick, seedData.totalTicks - 1);
    socket.send(JSON.stringify(buildTelemetryBatch(seedData.frames[lastTick])));
  }

  socket.on("close", () => console.log(`Client disconnected (${wss.clients.size - 1} total)`));
});

server.listen(WS_PORT, () => {
  console.log(`OilTrack Pro mock server listening on ws://localhost:${WS_PORT}`);
  console.log(`  GET  /status                    — current tick / elapsed / remaining`);
  console.log(`  GET  /vehicles                  — fleet metadata (augmented)`);
  console.log(`  POST /reset                     — restart session at tick 0`);
  console.log(`  POST /vehicle/:id/weight        — mobile weight override`);
  console.log(`Tick interval: ${TICK_INTERVAL_MS}ms (${seedData.totalTicks} ticks total)`);
});

setInterval(dispatchTick, TICK_INTERVAL_MS);
