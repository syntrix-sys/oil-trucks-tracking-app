"use client";

import { useTelemetryStore } from "@/store/telemetryStore";
import type { Vehicle } from "@oiltrack/types";

const HTTP_URL = (process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080").replace(/^ws/, "http");

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
  const cargoLitresOverrides = useTelemetryStore((s) => s.cargoLitresOverrides);
  const loadEntries = useTelemetryStore((s) => s.loadEntries);

  const setVehicles = useTelemetryStore((s) => s.setVehicles);

  async function refreshVehicles() {
    try {
      const res = await fetch(`${HTTP_URL}/vehicles`);
      if (res.ok) setVehicles(await res.json() as Record<string, Vehicle>);
    } catch { /* server offline */ }
  }

  return {
    vehicles,
    latestFrames,
    historyFrames,
    activeAlerts,
    driverAlerts,
    connectionStatus,
    currentTick,
    lastUpdate,
    cargoLitresOverrides,
    loadEntries,
    refreshVehicles,
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
