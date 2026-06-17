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

// In-memory weight overrides from mobile app: vehicleId → cargoLitres
const weightOverrides = new Map<string, number>();

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
