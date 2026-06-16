import * as http from "http";
import { WebSocketServer, WebSocket } from "ws";
import * as fs from "fs";
import * as path from "path";
import {
  SeedData,
  SeedFrame,
  StatusResponse,
  TelemetryBatchMessage,
} from "@oiltrack/types";

const WS_PORT = parseInt(process.env.WS_PORT || "8080", 10);
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS || "2000", 10);
const SEED_FILE = process.env.SEED_FILE || path.join(__dirname, "seed-data.json");

console.log(`Loading seed data from ${SEED_FILE}...`);
const seedData: SeedData = JSON.parse(fs.readFileSync(SEED_FILE, "utf-8"));
console.log(`Loaded ${seedData.totalTicks} ticks for ${Object.keys(seedData.vehicles).length} vehicles.`);

let currentTick = 0;
let sessionStartTime = Date.now();
let complete = false;

/** Recursively rewrite `timestamp`/`triggeredAt` ISO fields (stored as epoch-relative
 * offsets at generation time) to wall-clock time based on sessionStartTime. */
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
  return {
    type: "TELEMETRY_BATCH",
    tick: frame.tick,
    frames: rewriteTimestamps(frame.data),
  };
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
  console.log("Session reset to tick 0.");
}

// --- HTTP server (status / reset) + WebSocket upgrade on the same port ---

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/status") {
    const elapsedSeconds = currentTick * (seedData.tickIntervalSeconds);
    const remainingSeconds = (seedData.totalTicks - currentTick) * seedData.tickIntervalSeconds;
    const status: StatusResponse = {
      tick: currentTick,
      totalTicks: seedData.totalTicks,
      elapsedSeconds,
      remainingSeconds,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(status));
    return;
  }

  if (req.method === "GET" && req.url === "/vehicles") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(seedData.vehicles));
    return;
  }

  if (req.method === "POST" && req.url === "/reset") {
    resetSession();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, tick: currentTick }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (socket) => {
  console.log(`Client connected (${wss.clients.size} total)`);

  // Send the latest frame immediately so a new client doesn't wait up to TICK_INTERVAL_MS.
  if (currentTick > 0 || currentTick < seedData.totalTicks) {
    const lastTick = Math.min(currentTick, seedData.totalTicks - 1);
    socket.send(JSON.stringify(buildTelemetryBatch(seedData.frames[lastTick])));
  }

  socket.on("close", () => console.log(`Client disconnected (${wss.clients.size - 1} total)`));
});

server.listen(WS_PORT, () => {
  console.log(`OilTrack Pro mock server listening on ws://localhost:${WS_PORT}`);
  console.log(`  GET  /status — current tick / elapsed / remaining`);
  console.log(`  POST /reset  — restart the session at tick 0`);
  console.log(`Tick interval: ${TICK_INTERVAL_MS}ms (${seedData.totalTicks} ticks total)`);
});

setInterval(dispatchTick, TICK_INTERVAL_MS);
