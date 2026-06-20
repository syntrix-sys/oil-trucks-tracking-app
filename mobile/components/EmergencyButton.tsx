import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendPanicAlert, cancelPanicAlert } from '@/lib/api';

interface Props {
  compact?: boolean;
  phone?: string;
  vehicleId?: string;
  driverName?: string;
  location?: { lat: number; lng: number } | null;
}

const HOLD_MS = 3000;

export default function EmergencyButton({ compact = false, phone, vehicleId, driverName, location }: Props) {
  // 'idle' | 'holding' | 'active' | 'phone'
  const [mode, setMode]       = useState<'idle' | 'holding' | 'active' | 'phone'>('idle');
  const [progress, setProgress] = useState(0); // 0–100
  const [alertId, setAlertId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const pulseAnim    = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const holdTimer    = useRef<ReturnType<typeof setInterval> | null>(null);
  const cdTimer      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Button pulse
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // Sync progress state into animated value for the bar
  useEffect(() => {
    progressAnim.setValue(progress);
  }, [progress]);

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearInterval(holdTimer.current);
      if (cdTimer.current)   clearInterval(cdTimer.current);
    };
  }, []);

  // Phone modal countdown
  useEffect(() => {
    if (mode !== 'phone') return;
    setCountdown(5);
    cdTimer.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(cdTimer.current!); setMode('idle'); return 5; }
        return c - 1;
      });
    }, 1000);
    return () => { if (cdTimer.current) clearInterval(cdTimer.current); };
  }, [mode]);

  function startHold() {
    if (mode === 'active') return;
    setProgress(0);
    setMode('holding');
    const step = 50; // ms per tick
    let elapsed = 0;
    holdTimer.current = setInterval(() => {
      elapsed += step;
      const pct = Math.min(100, Math.round((elapsed / HOLD_MS) * 100));
      setProgress(pct);
      if (elapsed >= HOLD_MS) {
        clearInterval(holdTimer.current!);
        holdTimer.current = null;
        handleConfirmSOS();
      }
    }, step);
  }

  function cancelHold() {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
    setProgress(0);
    if (mode === 'holding') setMode('idle');
  }

  async function handleConfirmSOS() {
    if (!vehicleId || !driverName) {
      // No vehicle context — fall back to phone dialer
      setMode('phone');
      return;
    }
    setSending(true);
    setMode('active');
    try {
      const res = await sendPanicAlert({ vehicleId, driverName, location: location ?? null });
      setAlertId(res.alertId);
    } catch {
      setAlertId(null);
    } finally {
      setSending(false);
    }
  }

  async function handleCancelSOS() {
    if (vehicleId && alertId) {
      try { await cancelPanicAlert(vehicleId, alertId); } catch {}
    }
    setAlertId(null);
    setMode('idle');
  }

  function handleCall() {
    clearInterval(cdTimer.current!);
    setMode('idle');
    Linking.openURL(`tel:${(phone ?? '+92911').replace(/[^0-9+]/g, '')}`);
  }

  const barWidth = progressAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <>
      {/* The button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.btn, compact && styles.btnCompact, mode === 'active' && styles.btnActive]}
          onPressIn={startHold}
          onPressOut={cancelHold}
          activeOpacity={0.8}
          delayLongPress={HOLD_MS}
        >
          <Ionicons
            name={mode === 'active' ? 'warning' : 'call'}
            size={compact ? 16 : 18}
            color="#fff"
          />
          {!compact && (
            <Text style={styles.btnText}>
              {mode === 'active' ? 'SOS' : 'Emergency'}
            </Text>
          )}
        </TouchableOpacity>
      </Animated.View>

      {/* ── Hold-to-confirm modal ── */}
      <Modal visible={mode === 'holding'} transparent animationType="fade" onRequestClose={cancelHold}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.warningIcon}>
              <Ionicons name="warning" size={36} color="#EF4444" />
            </View>
            <Text style={styles.title}>Send SOS Alert?</Text>
            <Text style={styles.sub}>Keep holding to confirm. Release to cancel.</Text>

            {/* Progress bar */}
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: barWidth }]} />
            </View>
            <Text style={styles.progressLabel}>{progress}% — Keep holding…</Text>

            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtnFull]} onPress={cancelHold} activeOpacity={0.8}>
              <Ionicons name="close-circle-outline" size={18} color="#64748B" />
              <Text style={styles.cancelText}>Release / Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── SOS Active modal ── */}
      <Modal visible={mode === 'active'} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, styles.dialogPanic]}>
            <View style={styles.panicIcon}>
              <Ionicons name="warning" size={40} color="#EF4444" />
            </View>

            <Text style={styles.panicTitle}>SOS ALERT SENT</Text>
            <Text style={styles.sub}>
              {sending
                ? 'Sending alert to dispatch…'
                : 'Help is on the way. Stay calm and remain with your vehicle.'}
            </Text>

            {location && (
              <View style={styles.locationRow}>
                <Ionicons name="location" size={13} color="#3B82F6" />
                <Text style={styles.locationText}>
                  {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                </Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.callBtnStyle]} onPress={handleCall} activeOpacity={0.8}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.callText}>Call Dispatch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtnStyle]} onPress={handleCancelSOS} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel SOS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Phone-call fallback modal (no vehicle context) ── */}
      <Modal visible={mode === 'phone'} transparent animationType="fade" onRequestClose={() => setMode('idle')}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.warningIcon}>
              <Ionicons name="call" size={36} color="#EF4444" />
            </View>
            <Text style={styles.title}>Call Emergency?</Text>
            <Text style={styles.sub}>{phone ? `Calling: ${phone}` : 'Calling emergency services…'}</Text>

            <View style={styles.countdownRow}>
              <Text style={styles.cdLabel}>Auto-closing in</Text>
              <Text style={styles.cdValue}>{countdown}s</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.cancelBtnStyle]} onPress={() => setMode('idle')} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.callBtnStyle]} onPress={handleCall} activeOpacity={0.8}>
                <Ionicons name="call" size={16} color="#fff" />
                <Text style={styles.callText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EF4444', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  btnCompact: { paddingHorizontal: 10, paddingVertical: 7 },
  btnActive:  { backgroundColor: '#7F1D1D' },
  btnText:    { color: '#fff', fontWeight: '800', fontSize: 13 },

  overlay: {
    flex: 1, backgroundColor: '#000000B0',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  dialog: {
    backgroundColor: '#1E293B', borderRadius: 24,
    borderWidth: 1, borderColor: '#EF444440',
    padding: 28, alignItems: 'center', width: '100%', gap: 4,
  },
  dialogPanic: { borderColor: '#EF4444', borderWidth: 2 },

  warningIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EF444420', borderWidth: 2, borderColor: '#EF444440',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  panicIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EF444420', borderWidth: 2, borderColor: '#EF4444',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },

  title:     { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginBottom: 4 },
  panicTitle:{ fontSize: 22, fontWeight: '800', color: '#EF4444', letterSpacing: 1, marginBottom: 4 },
  sub:       { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginBottom: 16 },

  progressTrack: {
    width: '100%', height: 8, backgroundColor: '#0F172A',
    borderRadius: 4, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: {
    height: '100%', backgroundColor: '#EF4444', borderRadius: 4,
  },
  progressLabel: { fontSize: 12, color: '#EF4444', fontWeight: '700', marginBottom: 20 },

  locationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0F172A', borderRadius: 10, borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 12, paddingVertical: 8, marginBottom: 16,
  },
  locationText: { color: '#94A3B8', fontSize: 11, fontFamily: 'monospace' },

  countdownRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
  },
  cdLabel: { fontSize: 12, color: '#64748B' },
  cdValue: { fontSize: 20, fontWeight: '800', color: '#F59E0B', fontFamily: 'monospace' },

  btnRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 46, borderRadius: 12,
  },
  callBtnStyle:   { backgroundColor: '#EF4444' },
  cancelBtnStyle: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  cancelBtnFull:  { width: '100%', marginTop: 4, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155' },
  callText:   { color: '#fff', fontWeight: '800', fontSize: 14 },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
});
