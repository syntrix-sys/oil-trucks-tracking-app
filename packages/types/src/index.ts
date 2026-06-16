// Shared domain types for OilTrack Pro (§2 of PROMPT.md)
// Consumed by mock-server and web (and, later, mobile).

export * from "./thresholds";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  avatarUrl?: string;
  onDutySince: string; // ISO timestamp
}

export interface Route {
  id: string;
  name: string; // e.g. "Karachi → Lahore"
  waypoints: LatLng[];
  origin: string;
  destination: string;
  estimatedArrival: string; // ISO timestamp
}

export type VehicleStatus = "moving" | "idle" | "stopped" | "alert";

export interface Vehicle {
  id: string; // e.g. "TRK-001"
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  tankCapacityLitres: number;
  emptyWeightKg: number; // Tare weight
  maxGrossWeightKg: number; // GVW limit
  maxSpeedKmh: number;
  driver: Driver;
  route: Route;
  status: VehicleStatus;
  imageUrl?: string;
}

export type AlertType =
  | "SPEED_LIMIT_EXCEEDED"
  | "WEIGHT_LIMIT_EXCEEDED"
  | "SPEED_WEIGHT_RATIO_BREACH"
  | "HIGH_CONTAINER_TEMP"
  | "LOW_FUEL"
  | "ENGINE_OVERHEAT"
  | "GEOFENCE_BREACH"
  | "IDLE_TOO_LONG";

export type AlertSeverity = "info" | "warning" | "critical";

export interface Alert {
  id: string;
  vehicleId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  triggeredAt: string; // ISO timestamp
  acknowledged: boolean;
}

export interface TelemetryFrame {
  vehicleId: string;
  timestamp: string; // ISO timestamp
  location: {
    lat: number;
    lng: number;
    bearing: number; // degrees
    altitude: number; // metres
  };
  speed: {
    current: number; // km/h
    average: number; // km/h rolling 5-min average
    max: number; // km/h session max
  };
  weight: {
    tare: number; // kg
    cargo: number; // kg
    gross: number; // kg
    percentFull: number; // 0-100
  };
  temperature: {
    containerCelsius: number;
    ambientCelsius: number;
    engineCoolantCelsius: number;
  };
  engine: {
    rpm: number;
    fuelLevelPercent: number;
    odometerKm: number;
    runningHours: number;
  };
  alerts: Alert[];
}

// --- WebSocket protocol ---

export interface TelemetryBatchMessage {
  type: "TELEMETRY_BATCH";
  tick: number;
  frames: Record<string, TelemetryFrame>;
}

export interface DriverAlertMessage {
  type: "DRIVER_ALERT";
  vehicleId: string;
  alertType: AlertType;
  audioCommand: "PLAY_SIREN";
  message: string;
}

export type ServerMessage = TelemetryBatchMessage | DriverAlertMessage;

export interface StatusResponse {
  tick: number;
  totalTicks: number;
  elapsedSeconds: number;
  remainingSeconds: number;
}

// --- Seed dataset (mock-server/src/seed-data.json) ---

export interface SeedFrame {
  tick: number;
  offsetSeconds: number;
  data: Record<string, TelemetryFrame>;
  driverAlerts?: DriverAlertMessage[];
}

export interface SeedData {
  generatedAt: string;
  seed: string;
  tickIntervalSeconds: number;
  totalTicks: number;
  vehicles: Record<string, Vehicle>;
  frames: SeedFrame[];
}
