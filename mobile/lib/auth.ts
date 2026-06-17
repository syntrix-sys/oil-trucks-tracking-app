import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'oiltrack_driver_cnic';

export interface DriverSession {
  cnicNumber: string;
  name: string;
  vehicleId: string;
  phone: string;
}

// CNIC → driver session (mirrors mock-server/src/vehicles.ts)
const DRIVER_MAP: Record<string, Omit<DriverSession, 'cnicNumber'>> = {
  '35202-1234567-9': { name: 'Muhammad Usman', vehicleId: 'TRK-001', phone: '+92-301-2345001' },
  '42101-9876543-1': { name: 'Ahmed Raza',      vehicleId: 'TRK-002', phone: '+92-302-2345002' },
  '36302-5678901-2': { name: 'Ali Hassan',       vehicleId: 'TRK-003', phone: '+92-303-2345003' },
  '61101-2345678-3': { name: 'Tariq Mahmood',    vehicleId: 'TRK-004', phone: '+92-304-2345004' },
  '42201-3456789-4': { name: 'Bilal Shahzad',    vehicleId: 'TRK-005', phone: '+92-305-2345005' },
  '35201-4567890-5': { name: 'Faisal Iqbal',     vehicleId: 'TRK-006', phone: '+92-306-2345006' },
  '45501-5678901-6': { name: 'Nadeem Khan',       vehicleId: 'TRK-007', phone: '+92-307-2345007' },
  '17301-6789012-7': { name: 'Zubair Ahmed',      vehicleId: 'TRK-008', phone: '+92-308-2345008' },
};

export function formatCnic(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length <= 5)  return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12, 13)}`;
}

export function validateCnic(cnic: string): boolean {
  return /^\d{5}-\d{7}-\d$/.test(cnic) && cnic in DRIVER_MAP;
}

export function getDriverByCnic(cnic: string): DriverSession | null {
  const d = DRIVER_MAP[cnic];
  if (!d) return null;
  return { cnicNumber: cnic, ...d };
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
