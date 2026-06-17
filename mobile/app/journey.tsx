// Screen 2: Active Journey Dashboard
import { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { loadSession, type DriverSession } from '@/lib/auth';
import { updateCargoWeight, WS_URL, type TelemetryFrame } from '@/lib/api';
import EmergencyButton from '@/components/EmergencyButton';
import BreakModal from '@/components/BreakModal';
import TelemetryGauge from '@/components/TelemetryGauge';

type JourneyStatus = 'active' | 'break' | 'stopped';

interface GpsCoords {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export default function JourneyScreen() {
  const { vehicleId } = useLocalSearchParams<{ vehicleId?: string }>();
  const [session,  setSession]  = useState<DriverSession | null>(null);
  const [frame,    setFrame]    = useState<TelemetryFrame | null>(null);
  const [gps,      setGps]      = useState<GpsCoords | null>(null);
  const [cargoL,   setCargoL]   = useState<number | null>(null);
  const [cargoInput, setCargoInput] = useState('');
  const [status,   setStatus]   = useState<JourneyStatus>('active');
  const [showBreak, setShowBreak] = useState(false);
  const [elapsed,  setElapsed]  = useState(0); // seconds
  const [locationGranted, setLocationGranted] = useState(false);
  const [locationBlocked, setLocationBlocked] = useState(false);

  const wsRef    = useRef<WebSocket | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load session
  useEffect(() => {
    loadSession().then((s) => {
      if (!s) { router.replace('/auth'); return; }
      setSession(s);
    });
  }, []);

  // Request location
  useEffect(() => {
    (async () => {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setLocationBlocked(true);
        return;
      }
      setLocationGranted(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude, accuracy: loc.coords.accuracy });

      // Watch position
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 20 },
        (l) => setGps({ lat: l.coords.latitude, lng: l.coords.longitude, accuracy: l.coords.accuracy })
      );
    })();
  }, []);

  // Connect WebSocket for telemetry
  useEffect(() => {
    if (!vehicleId) return;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'TELEMETRY_BATCH' && msg.frames[vehicleId]) {
          const f: TelemetryFrame = msg.frames[vehicleId];
          setFrame(f);
          // Sync cargo liters from server override if present
          if (f.weight.cargoLitres !== undefined) {
            setCargoL(f.weight.cargoLitres);
            setCargoInput(String(Math.round(f.weight.cargoLitres)));
          } else if (cargoL === null) {
            // Tank capacities per vehicle (mirrors vehicles.ts)
            const TANK_CAPACITY: Record<string, number> = {
              'TRK-001': 30000, 'TRK-002': 28000, 'TRK-003': 32000,
              'TRK-004': 33000, 'TRK-005': 31000, 'TRK-006': 29000,
              'TRK-007': 27000, 'TRK-008': 25000,
            };
            const capacity = (vehicleId && TANK_CAPACITY[vehicleId]) ?? 28000;
            const derived = Math.round((f.weight.percentFull / 100) * capacity);
            setCargoL(derived);
            setCargoInput(String(derived));
          }
        }
      } catch {}
    };
    ws.onerror = () => {};
    return () => ws.close();
  }, [vehicleId]);

  // Elapsed timer
  useEffect(() => {
    if (status !== 'active') return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  async function handleCargoUpdate() {
    const liters = parseFloat(cargoInput);
    if (isNaN(liters) || liters < 0) return;
    const vid = vehicleId ?? session?.vehicleId;
    if (!vid) return;
    setCargoL(liters);
    try {
      await updateCargoWeight(vid, liters);
    } catch {
      Alert.alert('Sync Failed', 'Could not send weight to server. Check your connection.');
    }
  }

  function handleBreakSave(reason: string, comments: string) {
    setStatus('break');
    setShowBreak(false);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function handleResume() {
    setStatus('active');
  }

  function handleEndTrip() {
    Alert.alert('End Trip', 'Are you sure you want to end this trip?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Trip', style: 'destructive',
        onPress: () => {
          wsRef.current?.close();
          router.replace('/orders');
        },
      },
    ]);
  }

  const vid      = vehicleId ?? session?.vehicleId ?? '—';
  const temp     = frame?.temperature.containerCelsius ?? 0;
  const pressure = frame?.temperature.tankPressureKPa  ?? 120 + Math.round(Math.random() * 30);
  const speed    = frame?.speed.current ?? 0;
  const fuel     = frame?.engine.fuelLevelPercent ?? 0;

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  if (locationBlocked) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Ionicons name="location-off-outline" size={56} color="#EF4444" />
        <Text style={styles.blockTitle}>Location Required</Text>
        <Text style={styles.blockSub}>
          OilTrack Pro requires location access to track your delivery journey.
          Please enable Location Services in Settings and restart the app.
        </Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/orders')}>
          <Text style={styles.backBtnText}>← Back to Orders</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEndTrip} style={styles.backBtn2}>
          <Ionicons name="arrow-back" size={18} color="#94A3B8" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Active Journey</Text>
          <Text style={styles.headerVehicle}>{vid}</Text>
        </View>
        <EmergencyButton compact phone={session?.phone} />
      </View>

      {/* Status bar */}
      <View style={[styles.statusBar, status === 'break' && styles.statusBarBreak]}>
        <View style={styles.statusDot}>
          <View style={[styles.dot, status === 'active' ? styles.dotActive : styles.dotBreak]} />
        </View>
        <Text style={[styles.statusText, status === 'break' && styles.statusTextBreak]}>
          {status === 'active' ? 'JOURNEY IN PROGRESS' : 'ON BREAK'}
        </Text>
        <Text style={styles.timerText}>{hh}:{mm}:{ss}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* GPS Location */}
        <View style={styles.section}>
          <Row icon="location" iconColor="#3B82F6" label="Current Location" />
          <View style={styles.gpsBox}>
            {locationGranted && gps ? (
              <>
                <View style={styles.coordRow}>
                  <CoordChip label="LAT" value={gps.lat.toFixed(5)} />
                  <CoordChip label="LNG" value={gps.lng.toFixed(5)} />
                </View>
                {gps.accuracy !== null && (
                  <Text style={styles.accuracy}>GPS accuracy: ±{Math.round(gps.accuracy)} m</Text>
                )}
              </>
            ) : (
              <Text style={styles.gpsWaiting}>Acquiring GPS signal…</Text>
            )}
          </View>
        </View>

        {/* Cargo Weight (Liters) */}
        <View style={styles.section}>
          <Row icon="water" iconColor="#F59E0B" label="Cargo Weight (Liters)" />
          <View style={styles.cargoCard}>
            <Text style={styles.cargoValue}>{cargoL !== null ? cargoL.toLocaleString() : '—'} L</Text>
            <Text style={styles.cargoSub}>Live cargo load</Text>
            <View style={styles.cargoInputRow}>
              <TextInput
                style={styles.cargoInput}
                value={cargoInput}
                onChangeText={setCargoInput}
                keyboardType="numeric"
                placeholder="Enter liters"
                placeholderTextColor="#334155"
                returnKeyType="done"
                onSubmitEditing={handleCargoUpdate}
              />
              <TouchableOpacity style={styles.syncBtn} onPress={handleCargoUpdate} activeOpacity={0.8}>
                <Ionicons name="cloud-upload-outline" size={16} color="#0F172A" />
                <Text style={styles.syncBtnText}>Sync</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Telemetry Gauges */}
        <View style={styles.section}>
          <Row icon="speedometer" iconColor="#8B5CF6" label="Telemetry Gauges" />
          <View style={styles.gaugeGrid}>
            <TelemetryGauge
              label="Container Temp"
              value={temp}
              unit="°C"
              min={0} max={80}
              warningAt={58} criticalAt={65}
              icon="thermometer-outline"
            />
            <TelemetryGauge
              label="Tank Pressure"
              value={pressure}
              unit="kPa"
              min={80} max={200}
              warningAt={150} criticalAt={170}
              icon="radio-outline"
            />
            <TelemetryGauge
              label="Speed"
              value={speed}
              unit="km/h"
              min={0} max={100}
              warningAt={85} criticalAt={95}
              icon="speedometer-outline"
            />
            <TelemetryGauge
              label="Fuel Level"
              value={fuel}
              unit="%"
              min={0} max={100}
              warningAt={20} criticalAt={10}
              icon="battery-half-outline"
              invertColors
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Row icon="options" iconColor="#64748B" label="Journey Controls" />
          <View style={styles.actionRow}>
            {status === 'active' ? (
              <TouchableOpacity style={styles.breakBtn} onPress={() => setShowBreak(true)} activeOpacity={0.8}>
                <Ionicons name="pause-circle-outline" size={20} color="#F59E0B" />
                <Text style={styles.breakBtnText}>Take a Break</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.resumeBtn} onPress={handleResume} activeOpacity={0.8}>
                <Ionicons name="play-circle-outline" size={20} color="#22C55E" />
                <Text style={styles.resumeBtnText}>Resume Journey</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.endBtn} onPress={handleEndTrip} activeOpacity={0.8}>
              <Ionicons name="stop-circle-outline" size={20} color="#EF4444" />
              <Text style={styles.endBtnText}>End Trip</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <BreakModal
        visible={showBreak}
        onSave={handleBreakSave}
        onCancel={() => setShowBreak(false)}
      />
    </SafeAreaView>
  );
}

function Row({ icon, iconColor, label }: { icon: string; iconColor: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
      <Ionicons name={icon as any} size={14} color={iconColor} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 }}>{label}</Text>
    </View>
  );
}

function CoordChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, padding: 10, alignItems: 'center' }}>
      <Text style={{ fontSize: 9, color: '#475569', fontWeight: '700', letterSpacing: 1 }}>{label}</Text>
      <Text style={{ fontSize: 14, color: '#F1F5F9', fontFamily: 'monospace', marginTop: 3, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#0F172A' },
  center: { justifyContent: 'center', alignItems: 'center', padding: 32 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1E293B', gap: 8,
  },
  backBtn2: { padding: 6 },
  headerCenter: { flex: 1 },
  headerTitle:  { fontSize: 15, fontWeight: '800', color: '#F1F5F9' },
  headerVehicle:{ fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 1 },

  statusBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#22C55E10', borderBottomWidth: 1, borderBottomColor: '#22C55E20',
    gap: 8,
  },
  statusBarBreak: { backgroundColor: '#F59E0B10', borderBottomColor: '#F59E0B20' },
  statusDot:  { alignItems: 'center', justifyContent: 'center' },
  dot:        { width: 8, height: 8, borderRadius: 4 },
  dotActive:  { backgroundColor: '#22C55E' },
  dotBreak:   { backgroundColor: '#F59E0B' },
  statusText: { flex: 1, fontSize: 11, fontWeight: '800', color: '#22C55E', letterSpacing: 1.5 },
  statusTextBreak: { color: '#F59E0B' },
  timerText:  { fontSize: 14, fontWeight: '700', color: '#94A3B8', fontFamily: 'monospace' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 32 },

  section: {
    backgroundColor: '#1E293B', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', padding: 14,
  },

  gpsBox: { gap: 8 },
  coordRow: { flexDirection: 'row', gap: 8 },
  accuracy: { fontSize: 10, color: '#475569', textAlign: 'center' },
  gpsWaiting: { fontSize: 12, color: '#475569', textAlign: 'center', paddingVertical: 8 },

  cargoCard:     { alignItems: 'center', paddingVertical: 8, gap: 4 },
  cargoValue:    { fontSize: 44, fontWeight: '800', color: '#F59E0B' },
  cargoSub:      { fontSize: 11, color: '#64748B', marginBottom: 12 },
  cargoInputRow: { flexDirection: 'row', gap: 8, width: '100%' },
  cargoInput: {
    flex: 1, backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#334155',
    color: '#F1F5F9', fontSize: 15, paddingHorizontal: 12, height: 44, fontFamily: 'monospace',
  },
  syncBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F59E0B', borderRadius: 10, paddingHorizontal: 14, height: 44,
  },
  syncBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 13 },

  gaugeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  actionRow: { flexDirection: 'row', gap: 10 },
  breakBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F59E0B20', borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B40', height: 50,
  },
  breakBtnText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
  resumeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#22C55E20', borderRadius: 12, borderWidth: 1, borderColor: '#22C55E40', height: 50,
  },
  resumeBtnText: { color: '#22C55E', fontWeight: '700', fontSize: 13 },
  endBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#EF444420', borderRadius: 12, borderWidth: 1, borderColor: '#EF444440',
    paddingHorizontal: 16, height: 50,
  },
  endBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },

  blockTitle: { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginTop: 16, marginBottom: 8 },
  blockSub: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 20, backgroundColor: '#1E293B', borderRadius: 10 },
  backBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },
});
