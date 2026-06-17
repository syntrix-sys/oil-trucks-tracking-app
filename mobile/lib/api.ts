const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://192.168.1.100:8080';

export const WS_URL = SERVER_URL.replace(/^http/, 'ws');

export async function updateCargoWeight(vehicleId: string, liters: number): Promise<void> {
  const res = await fetch(`${SERVER_URL}/vehicle/${vehicleId}/weight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ liters }),
  });
  if (!res.ok) throw new Error(`Weight sync failed: ${res.status} ${res.statusText}`);
}

export interface TelemetryFrame {
  vehicleId: string;
  timestamp: string;
  location: { lat: number; lng: number; bearing: number; altitude: number };
  speed: { current: number; average: number; max: number };
  weight: { tare: number; cargo: number; gross: number; percentFull: number; cargoLitres?: number };
  temperature: { containerCelsius: number; ambientCelsius: number; engineCoolantCelsius: number; tankPressureKPa?: number };
  engine: { rpm: number; fuelLevelPercent: number; odometerKm: number; runningHours: number };
}

export interface TelemetryBatch {
  type: 'TELEMETRY_BATCH';
  tick: number;
  frames: Record<string, TelemetryFrame>;
}
