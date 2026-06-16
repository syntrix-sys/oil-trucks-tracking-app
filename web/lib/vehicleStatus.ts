import type { TelemetryFrame, VehicleStatus } from "@oiltrack/types";

/** Derives a live status from the current telemetry frame. */
export function deriveVehicleStatus(frame: TelemetryFrame | undefined): VehicleStatus {
  if (!frame) return "stopped";
  if (frame.alerts.some((a) => a.severity === "critical")) return "alert";
  if (frame.speed.current < 1) return "stopped";
  if (frame.speed.current < 8) return "idle";
  return "moving";
}

export function highestSeverity(frame: TelemetryFrame | undefined): "none" | "info" | "warning" | "critical" {
  if (!frame || frame.alerts.length === 0) return "none";
  if (frame.alerts.some((a) => a.severity === "critical")) return "critical";
  if (frame.alerts.some((a) => a.severity === "warning")) return "warning";
  return "info";
}
