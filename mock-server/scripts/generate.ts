import * as fs from "fs";
import * as path from "path";
import { SeedData, SeedFrame, TelemetryFrame, Vehicle, Alert, DriverAlertMessage } from "@oiltrack/types";
import { VEHICLE_DEFS } from "../src/vehicles";
import { ROUTE_ANCHORS } from "../src/routes";
import {
  buildRouteTrack,
  buildSpeedProfile,
  buildDistanceSequence,
  pointAtDistance,
  totalDistanceKm,
  TOTAL_TICKS,
  TICK_SECONDS,
} from "../src/generator/positionTrack";
import {
  createSensorContext,
  containerTemperature,
  ambientTemperature,
  engineCoolantTemperature,
  grossWeightKg,
  percentFull,
  engineRpm,
  fuelLevelPercent,
  odometerKm,
  runningHours,
  altitudeMeters,
} from "../src/generator/sensorChannels";
import {
  speedOverride,
  weightOverride,
  containerTempOverride,
  forcedAlerts,
  applySeverityOverrides,
  driverAlertForTick,
  fuelDepletionRate,
} from "../src/generator/eventTimeline";
import { evaluateAlerts } from "../src/alerts";

const GENERATED_AT = new Date();
const SEED = "oiltrack-demo-v1";

console.log(`Generating seed data (seed=${SEED}, ticks=${TOTAL_TICKS})...`);

const vehiclesMap: Record<string, Vehicle> = {};
const perVehicleFrames: Record<string, TelemetryFrame[]> = {};
const perTickDriverAlerts: DriverAlertMessage[][] = Array.from({ length: TOTAL_TICKS }, () => []);

for (const def of VEHICLE_DEFS) {
  const track = buildRouteTrack(ROUTE_ANCHORS[def.id]);
  const routeTotalKm = totalDistanceKm(track);
  const startDistanceKm = def.startProgressPercent * routeTotalKm;

  const baseSpeedProfile = buildSpeedProfile(def.id, def.cruiseSpeedKmh);
  const finalSpeedProfile = baseSpeedProfile.map((s, t) => speedOverride(def.id, t, s));
  const distances = buildDistanceSequence(finalSpeedProfile);

  const ctx = createSensorContext(def.id);
  const fuelRate = fuelDepletionRate(def.id);
  const frames: TelemetryFrame[] = [];
  let runningMax = 0;

  // Rolling 5-min (150-tick) average speed window.
  const speedWindow: number[] = [];

  for (let tick = 0; tick < TOTAL_TICKS; tick++) {
    const speedKmh = finalSpeedProfile[tick];
    runningMax = Math.max(runningMax, speedKmh);

    speedWindow.push(speedKmh);
    if (speedWindow.length > 150) speedWindow.shift();
    const avgSpeed = speedWindow.reduce((a, b) => a + b, 0) / speedWindow.length;

    const pos = pointAtDistance(track, startDistanceKm + distances[tick]);

    const naturalWeight = grossWeightKg(def.initialGrossWeightKg, tick);
    const weight = weightOverride(def.id, tick, naturalWeight);

    const naturalContainerTemp = containerTemperature(ctx, tick);
    const containerTemp = containerTempOverride(def.id, tick, naturalContainerTemp);

    const ambientTemp = ambientTemperature(ctx, tick, def.ambientTempCelsius);
    const coolantTemp = engineCoolantTemperature(ctx, tick, speedKmh);
    const rpm = engineRpm(ctx, tick, speedKmh);
    const fuel = fuelLevelPercent(def.initialFuelPercent, tick, fuelRate);
    const odo = odometerKm(def.startOdometerKm, distances[tick]);
    const hours = runningHours(def.startingRunningHours, tick);
    const cargoPercent = percentFull(weight, def.emptyWeightKg, def.maxGrossWeightKg);

    // Placeholder timestamp; the runtime server rewrites this to wall-clock time on dispatch.
    const timestamp = new Date(tick * TICK_SECONDS * 1000).toISOString();

    let alerts: Alert[] = evaluateAlerts(def, tick, timestamp, {
      speedKmh,
      grossWeightKg: weight,
      containerTempCelsius: containerTemp,
      engineCoolantCelsius: coolantTemp,
      fuelLevelPercent: fuel,
      location: { lat: pos.lat, lng: pos.lng },
    });

    for (const fa of forcedAlerts(def.id, tick, timestamp)) {
      alerts = alerts.filter((a) => a.type !== fa.type);
      alerts.push(fa);
    }

    alerts = applySeverityOverrides(def.id, tick, alerts);

    const driverAlert = driverAlertForTick(def.id, tick);
    if (driverAlert) perTickDriverAlerts[tick].push(driverAlert);

    const frame: TelemetryFrame = {
      vehicleId: def.id,
      timestamp,
      location: {
        lat: pos.lat,
        lng: pos.lng,
        bearing: pos.bearing,
        altitude: altitudeMeters(ctx, tick),
      },
      speed: {
        current: Math.round(speedKmh * 10) / 10,
        average: Math.round(avgSpeed * 10) / 10,
        max: Math.round(runningMax * 10) / 10,
      },
      weight: {
        tare: def.emptyWeightKg,
        cargo: Math.round(weight - def.emptyWeightKg),
        gross: Math.round(weight),
        percentFull: Math.round(cargoPercent * 10) / 10,
      },
      temperature: {
        containerCelsius: Math.round(containerTemp * 10) / 10,
        ambientCelsius: Math.round(ambientTemp * 10) / 10,
        engineCoolantCelsius: Math.round(coolantTemp * 10) / 10,
      },
      engine: {
        rpm,
        fuelLevelPercent: Math.round(fuel * 10) / 10,
        odometerKm: Math.round(odo * 10) / 10,
        runningHours: Math.round(hours * 1000) / 1000,
      },
      alerts,
    };

    frames.push(frame);
  }

  perVehicleFrames[def.id] = frames;

  const initialStatus = frames[0].speed.current > 5 ? "moving" : "idle";
  const estimatedRemainingKm = Math.max(0, routeTotalKm - (startDistanceKm + distances[TOTAL_TICKS - 1]));
  const estimatedArrival = new Date(
    GENERATED_AT.getTime() + (estimatedRemainingKm / def.cruiseSpeedKmh) * 3600 * 1000
  ).toISOString();

  vehiclesMap[def.id] = {
    id: def.id,
    registrationNumber: def.registrationNumber,
    make: def.make,
    model: def.model,
    year: def.year,
    tankCapacityLitres: def.tankCapacityLitres,
    emptyWeightKg: def.emptyWeightKg,
    maxGrossWeightKg: def.maxGrossWeightKg,
    maxSpeedKmh: def.maxSpeedKmh,
    driver: def.driver,
    route: {
      id: `ROUTE-${def.id}`,
      name: def.routeName,
      waypoints: track.map((p) => ({ lat: p.lat, lng: p.lng })),
      origin: def.origin,
      destination: def.destination,
      estimatedArrival,
    },
    status: initialStatus,
  };

  console.log(`  ${def.id}: ${track.length} track points, ${routeTotalKm.toFixed(1)}km route, start ${(def.startProgressPercent * 100).toFixed(0)}%`);
}

const frames: SeedFrame[] = [];
for (let tick = 0; tick < TOTAL_TICKS; tick++) {
  const data: Record<string, TelemetryFrame> = {};
  for (const def of VEHICLE_DEFS) {
    data[def.id] = perVehicleFrames[def.id][tick];
  }
  const seedFrame: SeedFrame = {
    tick,
    offsetSeconds: tick * TICK_SECONDS,
    data,
  };
  if (perTickDriverAlerts[tick].length > 0) {
    seedFrame.driverAlerts = perTickDriverAlerts[tick];
  }
  frames.push(seedFrame);
}

const seedData: SeedData = {
  generatedAt: GENERATED_AT.toISOString(),
  seed: SEED,
  tickIntervalSeconds: TICK_SECONDS,
  totalTicks: TOTAL_TICKS,
  vehicles: vehiclesMap,
  frames,
};

const outPath = path.join(__dirname, "..", "src", "seed-data.json");
fs.writeFileSync(outPath, JSON.stringify(seedData));

const sizeMb = fs.statSync(outPath).size / (1024 * 1024);
console.log(`Wrote ${outPath} (${sizeMb.toFixed(2)} MB)`);

// --- Spot-checks for scripted events ---
const check = (label: string, vehicleId: string, tick: number) => {
  const f = perVehicleFrames[vehicleId][tick];
  console.log(
    `  [${label}] tick=${tick} ${vehicleId} speed=${f.speed.current} gross=${f.weight.gross} ` +
      `containerTemp=${f.temperature.containerCelsius} coolant=${f.temperature.engineCoolantCelsius} ` +
      `fuel=${f.engine.fuelLevelPercent} alerts=${f.alerts.map((a) => `${a.type}/${a.severity}`).join(",") || "-"}`
  );
};

console.log("Spot-checks:");
check("T+08:00 SPEED_LIMIT", "TRK-003", 240);
check("T+12:30 RATIO_CRITICAL", "TRK-003", 375);
check("T+14:00 RESOLVE", "TRK-003", 420);
check("T+19:45 TEMP_WARN", "TRK-006", 593);
check("T+22:00 TEMP_CRIT", "TRK-006", 660);
check("T+24:30 TEMP_RESOLVE", "TRK-006", 735);
check("T+31:00 TRK-007 TEMP", "TRK-007", 930);
check("T+35:00 WEIGHT_CRIT", "TRK-004", 1050);
check("T+41:15 LOW_FUEL", "TRK-001", 1238);
check("T+47:00 RATIO_CRITICAL", "TRK-002", 1410);
check("T+49:00 RESOLVE", "TRK-002", 1470);
check("T+55:00 ENGINE_OVERHEAT", "TRK-008", 1650);
check("T+57:30 LOW_FUEL_CRIT", "TRK-005", 1725);
