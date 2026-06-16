"use client";

import { useTelemetryStore } from "@/store/telemetryStore";

/**
 * Convenience hook exposing the live fleet telemetry state.
 * Requires `useWebSocketConnection()` to have been mounted once (in the
 * dashboard layout) so the store is kept up to date.
 */
export function useTelemetry() {
  const vehicles = useTelemetryStore((s) => s.vehicles);
  const latestFrames = useTelemetryStore((s) => s.telemetry);
  const historyFrames = useTelemetryStore((s) => s.history);
  const activeAlerts = useTelemetryStore((s) => s.activeAlerts);
  const driverAlerts = useTelemetryStore((s) => s.driverAlerts);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const currentTick = useTelemetryStore((s) => s.currentTick);
  const lastUpdate = useTelemetryStore((s) => s.lastUpdate);

  return {
    vehicles,
    latestFrames,
    historyFrames,
    activeAlerts,
    driverAlerts,
    connectionStatus,
    currentTick,
    lastUpdate,
  };
}

/** History for a single vehicle, optionally limited to the last N minutes (at 2s/tick). */
export function useVehicleHistory(vehicleId: string | null, minutes?: number) {
  return useTelemetryStore((s) => {
    if (!vehicleId) return [];
    const full = s.history[vehicleId] ?? [];
    if (!minutes) return full;
    const ticks = Math.ceil((minutes * 60) / 2);
    return full.slice(-ticks);
  });
}
