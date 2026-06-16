import { Alert, DriverAlertMessage } from "@oiltrack/types";

/**
 * Scripted alert events baked into the dataset at exact tick indices (§3.2.3).
 * tick = offsetSeconds / 2 (2s per tick).
 */

// TRK-003: speed raised at T+08:00, ratio-breach critical T+12:30 -> T+14:00
const TRK003_SPEED_RAISE_START = 240; // T+08:00
const TRK003_RATIO_BREACH_START = 375; // T+12:30
const TRK003_RESOLVE = 420; // T+14:00

// TRK-006: container temp spike T+19:45 -> T+24:30
const TRK006_RAMP_START = 563; // ~T+18:45
const TRK006_WARNING = 593; // T+19:45 -> 60C
const TRK006_CRITICAL = 660; // T+22:00 -> 66C
const TRK006_RESOLVE = 735; // T+24:30 -> 51C
const TRK006_RAMP_END = 765; // ~T+25:30 back to baseline

// TRK-004: weight spike T+35:00
const TRK004_WEIGHT_SPIKE_START = 1040;
const TRK004_WEIGHT_SPIKE_PEAK = 1050; // T+35:00 -> 38,200kg
const TRK004_WEIGHT_SPIKE_END = 1140;

// TRK-002: ratio-breach critical T+47:00 -> T+49:00
const TRK002_RATIO_BREACH_START = 1410; // T+47:00
const TRK002_RESOLVE = 1470; // T+49:00

const lerp = (a: number, b: number, f: number) => a + (b - a) * Math.max(0, Math.min(1, f));

/** Override the speed (km/h) used for both position integration and the displayed frame. */
export function speedOverride(vehicleId: string, tick: number, naturalSpeed: number): number {
  if (vehicleId === "TRK-003") {
    if (tick >= TRK003_SPEED_RAISE_START && tick < TRK003_RATIO_BREACH_START) {
      return 96 + Math.sin(tick * 0.3) * 1.5; // over 90 limit
    }
    if (tick >= TRK003_RATIO_BREACH_START && tick < TRK003_RESOLVE) {
      return 88 + Math.sin(tick * 0.3) * 1; // critical ratio window
    }
  }

  if (vehicleId === "TRK-002") {
    if (tick >= TRK002_RATIO_BREACH_START && tick < TRK002_RESOLVE) {
      return 94 + Math.sin(tick * 0.3) * 1; // critical ratio window
    }
    if (tick >= TRK002_RESOLVE && tick < TRK002_RESOLVE + 60) {
      return 75 + Math.sin(tick * 0.3) * 1; // driver slows to 75 km/h
    }
  }

  return naturalSpeed;
}

/**
 * Severity overrides for alerts whose generic threshold severity differs
 * from the scripted demo narrative (§3.2.3).
 */
export function applySeverityOverrides(vehicleId: string, tick: number, alerts: Alert[]): Alert[] {
  if (vehicleId === "TRK-003" && tick >= TRK003_SPEED_RAISE_START && tick < TRK003_RATIO_BREACH_START) {
    return alerts.map((a) =>
      a.type === "SPEED_LIMIT_EXCEEDED"
        ? { ...a, severity: "warning", message: "Speed 96 km/h exceeds limit of 90 km/h" }
        : a
    );
  }
  return alerts;
}

/** Override gross weight (kg) for scripted weight-related events. */
export function weightOverride(vehicleId: string, tick: number, naturalWeight: number): number {
  if (vehicleId === "TRK-003") {
    if (tick >= TRK003_RATIO_BREACH_START && tick < TRK003_RESOLVE) {
      return 36800; // matches scripted ratio narrative
    }
  }

  if (vehicleId === "TRK-004") {
    if (tick >= TRK004_WEIGHT_SPIKE_START && tick < TRK004_WEIGHT_SPIKE_PEAK) {
      const f = (tick - TRK004_WEIGHT_SPIKE_START) / (TRK004_WEIGHT_SPIKE_PEAK - TRK004_WEIGHT_SPIKE_START);
      return lerp(naturalWeight, 38200, f);
    }
    if (tick >= TRK004_WEIGHT_SPIKE_PEAK && tick < TRK004_WEIGHT_SPIKE_END) {
      const f = (tick - TRK004_WEIGHT_SPIKE_PEAK) / (TRK004_WEIGHT_SPIKE_END - TRK004_WEIGHT_SPIKE_PEAK);
      return lerp(38200, naturalWeight, f);
    }
  }

  if (vehicleId === "TRK-002") {
    if (tick >= TRK002_RATIO_BREACH_START && tick < TRK002_RESOLVE) {
      return 35500; // matches scripted ratio narrative
    }
  }

  return naturalWeight;
}

/** Override container temperature (C) for scripted temperature events (TRK-006). */
export function containerTempOverride(vehicleId: string, tick: number, naturalTemp: number): number {
  if (vehicleId === "TRK-006") {
    if (tick >= TRK006_RAMP_START && tick < TRK006_WARNING) {
      const f = (tick - TRK006_RAMP_START) / (TRK006_WARNING - TRK006_RAMP_START);
      return lerp(naturalTemp, 60, f);
    }
    if (tick >= TRK006_WARNING && tick < TRK006_CRITICAL) {
      const f = (tick - TRK006_WARNING) / (TRK006_CRITICAL - TRK006_WARNING);
      return lerp(60, 66, f);
    }
    if (tick >= TRK006_CRITICAL && tick < TRK006_RESOLVE) {
      const f = (tick - TRK006_CRITICAL) / (TRK006_RESOLVE - TRK006_CRITICAL);
      return lerp(66, 51, f);
    }
    if (tick >= TRK006_RESOLVE && tick < TRK006_RAMP_END) {
      const f = (tick - TRK006_RESOLVE) / (TRK006_RAMP_END - TRK006_RESOLVE);
      return lerp(51, naturalTemp, f);
    }
  }

  return naturalTemp;
}

/**
 * Forced SPEED_WEIGHT_RATIO_BREACH CRITICAL alerts for the two scripted
 * driver-alert events (TRK-003 @ T+12:30, TRK-002 @ T+47:00).
 */
export function forcedAlerts(vehicleId: string, tick: number, timestamp: string): Alert[] {
  if (vehicleId === "TRK-003" && tick >= TRK003_RATIO_BREACH_START && tick < TRK003_RESOLVE) {
    return [
      {
        id: `TRK-003-SPEED_WEIGHT_RATIO_BREACH-${TRK003_RATIO_BREACH_START}`,
        vehicleId: "TRK-003",
        type: "SPEED_WEIGHT_RATIO_BREACH",
        severity: "critical",
        message: "Speed/weight ratio 3.52 exceeds critical limit of 3.5 — reduce speed immediately!",
        triggeredAt: timestamp,
        acknowledged: false,
      },
    ];
  }

  if (vehicleId === "TRK-002" && tick >= TRK002_RATIO_BREACH_START && tick < TRK002_RESOLVE) {
    return [
      {
        id: `TRK-002-SPEED_WEIGHT_RATIO_BREACH-${TRK002_RATIO_BREACH_START}`,
        vehicleId: "TRK-002",
        type: "SPEED_WEIGHT_RATIO_BREACH",
        severity: "critical",
        message: "Speed/weight ratio 3.61 exceeds critical limit of 3.5 — reduce speed immediately!",
        triggeredAt: timestamp,
        acknowledged: false,
      },
    ];
  }

  return [];
}

/** DRIVER_ALERT broadcast (§3.3 step 5) — fired once at the onset of each critical ratio breach. */
export function driverAlertForTick(vehicleId: string, tick: number): DriverAlertMessage | null {
  if (vehicleId === "TRK-003" && tick === TRK003_RATIO_BREACH_START) {
    return {
      type: "DRIVER_ALERT",
      vehicleId: "TRK-003",
      alertType: "SPEED_WEIGHT_RATIO_BREACH",
      audioCommand: "PLAY_SIREN",
      message: "Warning! Speed/weight ratio exceeded. Reduce speed immediately.",
    };
  }

  if (vehicleId === "TRK-002" && tick === TRK002_RATIO_BREACH_START) {
    return {
      type: "DRIVER_ALERT",
      vehicleId: "TRK-002",
      alertType: "SPEED_WEIGHT_RATIO_BREACH",
      audioCommand: "PLAY_SIREN",
      message: "Warning! Speed/weight ratio exceeded. Reduce speed immediately.",
    };
  }

  return null;
}

/** Per-vehicle custom fuel-depletion rates (%/tick) so scripted LOW_FUEL events land on time (§3.2.3). */
export function fuelDepletionRate(vehicleId: string): number {
  if (vehicleId === "TRK-001") return (72 - 18) / 1238; // T+41:15 -> 18%
  if (vehicleId === "TRK-005") return (55 - 9) / 1725; // T+57:30 -> 9%
  return 0.015; // default ~27% drop over the full session
}
