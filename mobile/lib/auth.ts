import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:8080';
const AUTH_KEY = 'oiltrack_driver_cnic';

export interface DriverSession {
  cnicNumber: string;
  name: string;
  vehicleId: string;
  phone: string;
}

export function formatCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 5)  return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function isCnicFormatValid(cnic: string): boolean {
  return /^\d{5}-\d{7}-\d$/.test(cnic);
}

// Validates CNIC against the server and returns a session on success.
// Throws on network error; returns null if CNIC is not registered.
export async function authenticateDriver(cnicNumber: string): Promise<DriverSession | null> {
  const res = await fetch(`${SERVER_URL}/drivers/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cnicNumber }),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(`Auth server error: ${res.status}`);
  const data = await res.json();
  return data.session as DriverSession;
}

export async function saveSession(session: DriverSession): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session));
}

export async function loadSession(): Promise<DriverSession | null> {
  try {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as DriverSession) : null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY);
}
