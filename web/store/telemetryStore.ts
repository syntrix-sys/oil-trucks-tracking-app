import { create } from "zustand";
import type {
  Alert,
  DriverAlertMessage,
  LoadEntry,
  PanicAlertMessage,
  TelemetryFrame,
  Vehicle,
} from "@oiltrack/types";

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

const MAX_HISTORY_TICKS = 1800;

export type PanicRecord = {
  alertId: string;
  vehicleId: string;
  driverName: string;
  location: { lat: number; lng: number } | null;
  timestamp: string;
};

export interface TelemetryStoreState {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
  history: Record<string, TelemetryFrame[]>;
  activeAlerts: Alert[];
  driverAlerts: DriverAlertMessage[];
  panicAlerts: Record<string, PanicRecord>;
  loadEntries: Record<string, LoadEntry[]>;
  selectedVehicleId: string | null;
  connectionStatus: ConnectionStatus;
  currentTick: number;
  lastUpdate: string | null;
  cargoLitresOverrides: Record<string, number>;

  setVehicles: (vehicles: Record<string, Vehicle>) => void;
  ingestTelemetryBatch: (tick: number, frames: Record<string, TelemetryFrame>) => void;
  ingestDriverAlert: (message: DriverAlertMessage) => void;
  ingestWeightUpdate: (vehicleId: string, cargoLitres: number) => void;
  ingestPanicAlert: (message: PanicAlertMessage) => void;
  clearPanicAlert: (vehicleId: string) => void;
  ingestLoadUpdate: (vehicleId: string, entry: LoadEntry) => void;
  dismissDriverAlert: (vehicleId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  acknowledgeAllAlerts: (alertIds: string[]) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
}

export const useTelemetryStore = create<TelemetryStoreState>((set, get) => ({
  vehicles: {},
  telemetry: {},
  history: {},
  activeAlerts: [],
  driverAlerts: [],
  panicAlerts: {},
  loadEntries: {},
  selectedVehicleId: null,
  connectionStatus: "connecting",
  currentTick: 0,
  lastUpdate: null,
  cargoLitresOverrides: {},

  setVehicles: (vehicles) => set({ vehicles }),

  ingestTelemetryBatch: (tick, frames) => {
    const { history, activeAlerts } = get();
    const nextHistory: Record<string, TelemetryFrame[]> = { ...history };
    let nextActiveAlerts = activeAlerts;
    let lastUpdate = get().lastUpdate;

    for (const [vehicleId, frame] of Object.entries(frames)) {
      const prior = nextHistory[vehicleId] ?? [];
      const updated = [...prior, frame];
      if (updated.length > MAX_HISTORY_TICKS) updated.shift();
      nextHistory[vehicleId] = updated;
      lastUpdate = frame.timestamp;

      if (frame.alerts.length > 0) {
        const existingIds = new Set(nextActiveAlerts.map((a) => a.id));
        const fresh = frame.alerts.filter((a) => !existingIds.has(a.id));
        if (fresh.length > 0) nextActiveAlerts = [...nextActiveAlerts, ...fresh];
      }
    }

    set({
      currentTick: tick,
      telemetry: { ...get().telemetry, ...frames },
      history: nextHistory,
      activeAlerts: nextActiveAlerts,
      lastUpdate,
    });
  },

  ingestDriverAlert: (message) => {
    set({ driverAlerts: [...get().driverAlerts, message] });
  },

  ingestWeightUpdate: (vehicleId, cargoLitres) => {
    set({
      cargoLitresOverrides: { ...get().cargoLitresOverrides, [vehicleId]: cargoLitres },
    });
  },

  ingestPanicAlert: (message) => {
    const record: PanicRecord = {
      alertId: message.alertId,
      vehicleId: message.vehicleId,
      driverName: message.driverName,
      location: message.location,
      timestamp: message.timestamp,
    };
    set({ panicAlerts: { ...get().panicAlerts, [message.vehicleId]: record } });
  },

  clearPanicAlert: (vehicleId) => {
    const next = { ...get().panicAlerts };
    delete next[vehicleId];
    set({ panicAlerts: next });
  },

  ingestLoadUpdate: (vehicleId, entry) => {
    const prev = get().loadEntries[vehicleId] ?? [];
    const updated = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, 50);
    set({ loadEntries: { ...get().loadEntries, [vehicleId]: updated } });
  },

  dismissDriverAlert: (vehicleId) => {
    set({ driverAlerts: get().driverAlerts.filter((a) => a.vehicleId !== vehicleId) });
  },

  acknowledgeAlert: (alertId) => {
    set({
      activeAlerts: get().activeAlerts.map((a) =>
        a.id === alertId ? { ...a, acknowledged: true } : a
      ),
    });
  },

  acknowledgeAllAlerts: (alertIds) => {
    const idSet = new Set(alertIds);
    set({
      activeAlerts: get().activeAlerts.map((a) =>
        idSet.has(a.id) ? { ...a, acknowledged: true } : a
      ),
    });
  },

  setSelectedVehicleId: (id) => set({ selectedVehicleId: id }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),
}));
