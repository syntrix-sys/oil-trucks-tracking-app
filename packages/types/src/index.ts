// Shared domain types for OilTrack Pro
// Consumed by mock-server, web, and mobile.

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
  cnicNumber?: string;
  fatherName?: string;
  permanentAddress?: string;
}

export interface Route {
  id: string;
  name: string;
  waypoints: LatLng[];
  origin: string;
  destination: string;
  estimatedArrival: string; // ISO timestamp
}

export type VehicleStatus = "moving" | "idle" | "stopped" | "alert";

export interface Vehicle {
  id: string;
  registrationNumber: string;
  chassisNumber?: string;
  make: string;
  model: string;
  year: number;
  numberOfWheels?: number;
  tankCapacityLitres: number;
  emptyWeightKg: number;
  maxGrossWeightKg: number;
  maxSpeedKmh: number;
  cnic?: string;
  tripStartDate?: string;
  tripEndDate?: string;
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
    bearing: number;
    altitude: number;
  };
  speed: {
    current: number;
    average: number;
    max: number;
  };
  weight: {
    tare: number;
    cargo: number;
    gross: number;
    percentFull: number;
    cargoLitres?: number; // overridable by mobile app
  };
  temperature: {
    containerCelsius: number;
    ambientCelsius: number;
    engineCoolantCelsius: number;
    tankPressureKPa?: number;
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

export interface WeightUpdateMessage {
  type: "WEIGHT_UPDATE";
  vehicleId: string;
  cargoLitres: number;
  updatedAt: string;
}

export type ServerMessage = TelemetryBatchMessage | DriverAlertMessage | WeightUpdateMessage;

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

// --- Part 3: Profiles ---

export interface VehicleProfile {
  registrationNumber: string;
  chassisNumber: string;
  brand: string;
  model: string;
  maxWeightCapacityLiters: number;
  numberOfWheels: number;
  cnic: string;
}

export interface DriverProfile {
  userName: string;
  fatherName: string;
  phoneNumber: string;
  cnicNumber: string;
  permanentAddress: string;
}
