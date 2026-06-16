import {
  Alert,
  THRESHOLDS,
  speedWeightRatio,
  speedThresholds,
  grossWeightThresholds,
} from "@oiltrack/types";
import { VehicleDef } from "./vehicles";

export interface AlertInputs {
  speedKmh: number;
  grossWeightKg: number;
  containerTempCelsius: number;
  engineCoolantCelsius: number;
  fuelLevelPercent: number;
}

/** Threshold + ratio rule evaluation (§4). Returns the alerts active for one frame. */
export function evaluateAlerts(
  vehicle: VehicleDef,
  tick: number,
  timestamp: string,
  inputs: AlertInputs
): Alert[] {
  const alerts: Alert[] = [];
  const mk = (type: Alert["type"], severity: Alert["severity"], message: string): Alert => ({
    id: `${vehicle.id}-${type}-${tick}`,
    vehicleId: vehicle.id,
    type,
    severity,
    message,
    triggeredAt: timestamp,
    acknowledged: false,
  });

  // Speed limit
  const speedT = speedThresholds(vehicle.maxSpeedKmh);
  if (inputs.speedKmh > speedT.critical) {
    alerts.push(
      mk("SPEED_LIMIT_EXCEEDED", "critical", `Speed ${inputs.speedKmh.toFixed(0)} km/h exceeds limit of ${vehicle.maxSpeedKmh} km/h`)
    );
  } else if (inputs.speedKmh > speedT.warning) {
    alerts.push(
      mk("SPEED_LIMIT_EXCEEDED", "warning", `Speed ${inputs.speedKmh.toFixed(0)} km/h approaching limit of ${vehicle.maxSpeedKmh} km/h`)
    );
  }

  // Gross weight limit
  const weightT = grossWeightThresholds(vehicle.maxGrossWeightKg);
  if (inputs.grossWeightKg > weightT.critical) {
    alerts.push(
      mk("WEIGHT_LIMIT_EXCEEDED", "critical", `Gross weight ${inputs.grossWeightKg.toFixed(0)} kg exceeds limit of ${vehicle.maxGrossWeightKg} kg`)
    );
  } else if (inputs.grossWeightKg > weightT.warning) {
    alerts.push(
      mk("WEIGHT_LIMIT_EXCEEDED", "warning", `Gross weight ${inputs.grossWeightKg.toFixed(0)} kg approaching limit of ${vehicle.maxGrossWeightKg} kg`)
    );
  }

  // Speed/Weight ratio (primary safety rule, §4.1)
  const ratio = speedWeightRatio(inputs.speedKmh, inputs.grossWeightKg);
  if (ratio > THRESHOLDS.ratio.critical) {
    alerts.push(
      mk("SPEED_WEIGHT_RATIO_BREACH", "critical", `Speed/weight ratio ${ratio.toFixed(2)} exceeds critical limit of ${THRESHOLDS.ratio.critical}`)
    );
  } else if (ratio > THRESHOLDS.ratio.warning) {
    alerts.push(
      mk("SPEED_WEIGHT_RATIO_BREACH", "warning", `Speed/weight ratio ${ratio.toFixed(2)} exceeds warning limit of ${THRESHOLDS.ratio.warning}`)
    );
  } else if (ratio > THRESHOLDS.ratio.caution) {
    alerts.push(
      mk("SPEED_WEIGHT_RATIO_BREACH", "info", `Speed/weight ratio ${ratio.toFixed(2)} above caution limit of ${THRESHOLDS.ratio.caution}`)
    );
  }

  // Container temperature
  if (inputs.containerTempCelsius > THRESHOLDS.containerTemp.critical) {
    alerts.push(
      mk("HIGH_CONTAINER_TEMP", "critical", `Container temperature ${inputs.containerTempCelsius.toFixed(1)}°C exceeds critical limit of ${THRESHOLDS.containerTemp.critical}°C`)
    );
  } else if (inputs.containerTempCelsius > THRESHOLDS.containerTemp.warning) {
    alerts.push(
      mk("HIGH_CONTAINER_TEMP", "warning", `Container temperature ${inputs.containerTempCelsius.toFixed(1)}°C exceeds warning limit of ${THRESHOLDS.containerTemp.warning}°C`)
    );
  }

  // Engine coolant temperature
  if (inputs.engineCoolantCelsius > THRESHOLDS.engineCoolantTemp.critical) {
    alerts.push(
      mk("ENGINE_OVERHEAT", "critical", `Engine coolant temperature ${inputs.engineCoolantCelsius.toFixed(1)}°C exceeds critical limit of ${THRESHOLDS.engineCoolantTemp.critical}°C`)
    );
  } else if (inputs.engineCoolantCelsius > THRESHOLDS.engineCoolantTemp.warning) {
    alerts.push(
      mk("ENGINE_OVERHEAT", "warning", `Engine coolant temperature ${inputs.engineCoolantCelsius.toFixed(1)}°C exceeds warning limit of ${THRESHOLDS.engineCoolantTemp.warning}°C`)
    );
  }

  // Fuel level
  if (inputs.fuelLevelPercent < THRESHOLDS.fuelLevel.critical) {
    alerts.push(
      mk("LOW_FUEL", "critical", `Fuel level ${inputs.fuelLevelPercent.toFixed(0)}% is critically low (below ${THRESHOLDS.fuelLevel.critical}%)`)
    );
  } else if (inputs.fuelLevelPercent < THRESHOLDS.fuelLevel.warning) {
    alerts.push(
      mk("LOW_FUEL", "warning", `Fuel level ${inputs.fuelLevelPercent.toFixed(0)}% is low (below ${THRESHOLDS.fuelLevel.warning}%)`)
    );
  }

  return alerts;
}
