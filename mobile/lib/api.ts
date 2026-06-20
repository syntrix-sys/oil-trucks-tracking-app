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

export interface PanicPayload {
  vehicleId: string;
  driverName: string;
  location: { lat: number; lng: number } | null;
}

export async function sendPanicAlert(payload: PanicPayload): Promise<{ alertId: string }> {
  const res = await fetch(`${SERVER_URL}/vehicle/${payload.vehicleId}/panic`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Panic alert failed: ${res.status}`);
  return res.json();
}

export async function cancelPanicAlert(vehicleId: string, alertId: string): Promise<void> {
  await fetch(`${SERVER_URL}/vehicle/${vehicleId}/panic/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alertId }),
  });
}

export interface LoadEntry {
  id: string;
  vehicleId: string;
  timestamp: string;
  totalLiters: number;
  note?: string;
  syncedFromMobile: boolean;
}

export async function sendLoadEntry(vehicleId: string, totalLiters: number, note?: string): Promise<LoadEntry> {
  const res = await fetch(`${SERVER_URL}/vehicle/${vehicleId}/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totalLiters, note }),
  });
  if (!res.ok) throw new Error(`Load sync failed: ${res.status}`);
  const data = await res.json();
  return data.entry as LoadEntry;
}

export async function fetchLoadHistory(vehicleId: string): Promise<LoadEntry[]> {
  const res = await fetch(`${SERVER_URL}/vehicle/${vehicleId}/load/history`);
  if (!res.ok) return [];
  return res.json();
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
