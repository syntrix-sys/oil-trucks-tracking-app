import seedrandom from "seedrandom";

const TOTAL_TICKS = 1800;

/** Deterministic per-vehicle phase/amplitude seeds (§3.2.2 — seedrandom(vehicleId)). */
function vehicleSeeds(vehicleId: string) {
  const rng = seedrandom(vehicleId);
  return {
    containerPhase: rng() * Math.PI * 2,
    containerNoisePhase: rng() * Math.PI * 2,
    ambientNoisePhase: rng() * Math.PI * 2,
    coolantNoisePhase: rng() * Math.PI * 2,
    rpmNoisePhase: rng() * Math.PI * 2,
    altitudePhase: rng() * Math.PI * 2,
    altitudeBase: 40 + rng() * 120,
  };
}

export interface SensorContext {
  vehicleId: string;
  seeds: ReturnType<typeof vehicleSeeds>;
}

export function createSensorContext(vehicleId: string): SensorContext {
  return { vehicleId, seeds: vehicleSeeds(vehicleId) };
}

/**
 * Container temperature: baseline 44C, slow sine drift (period 22min = 660 ticks),
 * +-1.2C high-freq noise. TRK-007 spikes to 63C at T+31min (tick 930) for 4min.
 */
export function containerTemperature(ctx: SensorContext, tick: number): number {
  const { containerPhase, containerNoisePhase } = ctx.seeds;
  const periodTicks = 660; // 22 min
  let temp =
    44 +
    2.5 * Math.sin((tick / periodTicks) * 2 * Math.PI + containerPhase) +
    1.2 * Math.sin(tick * 0.35 + containerNoisePhase);

  if (ctx.vehicleId === "TRK-007") {
    const spikeStart = 930; // T+31:00
    const spikeDuration = 120; // 4 min
    const rampTicks = 30;
    if (tick >= spikeStart - rampTicks && tick < spikeStart) {
      const f = (tick - (spikeStart - rampTicks)) / rampTicks;
      temp = temp + (63 - temp) * f;
    } else if (tick >= spikeStart && tick < spikeStart + spikeDuration) {
      temp = 63 + Math.sin(tick * 0.3) * 0.5;
    } else if (tick >= spikeStart + spikeDuration && tick < spikeStart + spikeDuration + rampTicks) {
      const f = (tick - (spikeStart + spikeDuration)) / rampTicks;
      temp = 63 - (63 - temp) * f;
    }
  }

  return temp;
}

/** Ambient temperature: fixed per route region (§3.2.2) + small noise. */
export function ambientTemperature(ctx: SensorContext, tick: number, baselineCelsius: number): number {
  return baselineCelsius + 0.3 * Math.sin(tick * 0.02 + ctx.seeds.ambientNoisePhase);
}

/** Engine coolant temperature: baseline ~82C, rises slightly with speed. TRK-008 spikes to 98C at T+55:00. */
export function engineCoolantTemperature(ctx: SensorContext, tick: number, speedKmh: number): number {
  let temp = 82 + speedKmh * 0.08 + 0.6 * Math.sin(tick * 0.05 + ctx.seeds.coolantNoisePhase);

  if (ctx.vehicleId === "TRK-008") {
    const spikeStart = 1650; // T+55:00
    const spikeDuration = 150; // 5 min
    const rampTicks = 30;
    if (tick >= spikeStart - rampTicks && tick < spikeStart) {
      const f = (tick - (spikeStart - rampTicks)) / rampTicks;
      temp = temp + (98 - temp) * f;
    } else if (tick >= spikeStart && tick < Math.min(spikeStart + spikeDuration, TOTAL_TICKS)) {
      temp = 98 + Math.sin(tick * 0.3) * 0.4;
    }
  }

  return temp;
}

/** Gross weight decreases monotonically at 0.4kg/tick. */
export function grossWeightKg(initialGrossKg: number, tick: number): number {
  return initialGrossKg - tick * 0.4;
}

/** Cargo percent-full derived from gross weight relative to cargo capacity (never increases). */
export function percentFull(grossKg: number, emptyWeightKg: number, maxGrossWeightKg: number): number {
  const capacity = maxGrossWeightKg - emptyWeightKg;
  const cargo = grossKg - emptyWeightKg;
  return Math.max(0, Math.min(100, (cargo / capacity) * 100));
}

/** Engine RPM correlates with speed, plus small noise. */
export function engineRpm(ctx: SensorContext, tick: number, speedKmh: number): number {
  let base: number;
  if (speedKmh < 1) base = 750;
  else if (speedKmh <= 30) base = 900 + (speedKmh / 30) * 500;
  else if (speedKmh <= 70) base = 1400 + ((speedKmh - 30) / 40) * 500;
  else base = 1900 + Math.min((speedKmh - 70) / 30, 1) * 400;

  const noise = 50 * Math.sin(tick * 0.4 + ctx.seeds.rpmNoisePhase);
  return Math.round(base + noise);
}

/** Fuel level decreases at a per-vehicle rate (%/tick), tuned so scripted LOW_FUEL events land on schedule. */
export function fuelLevelPercent(initialFuelPercent: number, tick: number, ratePerTick: number): number {
  return Math.max(0, initialFuelPercent - tick * ratePerTick);
}

/** Odometer accumulates the cumulative distance traveled (km). */
export function odometerKm(startOdometerKm: number, cumulativeDistanceKm: number): number {
  return startOdometerKm + cumulativeDistanceKm;
}

/** Running hours increment 1/1800 hr per tick. */
export function runningHours(startHours: number, tick: number): number {
  return startHours + tick / 1800;
}

/** Slowly varying altitude (metres) along the route. */
export function altitudeMeters(ctx: SensorContext, tick: number): number {
  return ctx.seeds.altitudeBase + 15 * Math.sin(tick * 0.006 + ctx.seeds.altitudePhase);
}
