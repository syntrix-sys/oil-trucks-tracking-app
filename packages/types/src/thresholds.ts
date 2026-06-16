// Business rules & alert thresholds (§4 of PROMPT.md)

export type RatioBand = "normal" | "caution" | "warning" | "critical";

/** ratio = currentSpeedKmh / grossWeightKg * 1000 */
export function speedWeightRatio(speedKmh: number, grossWeightKg: number): number {
  return (speedKmh / grossWeightKg) * 1000;
}

export function ratioBand(ratio: number): RatioBand {
  if (ratio > 3.5) return "critical";
  if (ratio > 3.0) return "warning";
  if (ratio > 2.5) return "caution";
  return "normal";
}

export const THRESHOLDS = {
  containerTemp: { warning: 58, critical: 65 },
  engineCoolantTemp: { warning: 95, critical: 105 },
  fuelLevel: { warning: 20, critical: 10 }, // percent, below these values
  ratio: { caution: 2.5, warning: 3.0, critical: 3.5 },
} as const;

export function speedThresholds(maxSpeedKmh: number) {
  return {
    warning: maxSpeedKmh * 0.9,
    critical: maxSpeedKmh,
  };
}

export function grossWeightThresholds(maxGrossWeightKg: number) {
  return {
    warning: maxGrossWeightKg * 0.95,
    critical: maxGrossWeightKg,
  };
}
