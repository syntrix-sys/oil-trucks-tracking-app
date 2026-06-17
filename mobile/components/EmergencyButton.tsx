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

interface Props {
  compact?: boolean;
  phone?: string;
}

export default function EmergencyButton({ compact = false, phone }: Props) {
  const [visible, setVisible]   = useState(false);
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Clean up countdown timer if component unmounts while modal is open
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Pulse animation for the button
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  function openModal() {
    setCountdown(5);
    setVisible(true);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current!);
          setVisible(false);
          return 5;
        }
        return c - 1;
      });
    }, 1000);
  }

  function handleCall() {
    clearInterval(timerRef.current!);
    setVisible(false);
    const target = phone ?? '+92-911';
    Linking.openURL(`tel:${target.replace(/[^0-9+]/g, '')}`);
  }

  function handleClose() {
    clearInterval(timerRef.current!);
    setVisible(false);
  }

  return (
    <>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.btn, compact && styles.btnCompact]}
          onPress={openModal}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={compact ? 16 : 18} color="#fff" />
          {!compact && <Text style={styles.btnText}>Emergency</Text>}
        </TouchableOpacity>
      </Animated.View>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <View style={styles.overlay}>
          <View style={styles.dialog}>
            <View style={styles.iconWrap}>
              <Ionicons name="call" size={36} color="#EF4444" />
            </View>
            <Text style={styles.title}>Call Emergency?</Text>
            <Text style={styles.sub}>
              {phone ? `Calling: ${phone}` : 'Calling emergency services…'}
            </Text>

            <View style={styles.countdownWrap}>
              <Text style={styles.countdownLabel}>Auto-closing in</Text>
              <Text style={styles.countdown}>{countdown}s</Text>
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.8}>
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
  btnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  overlay: {
    flex: 1, backgroundColor: '#00000090',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  dialog: {
    backgroundColor: '#1E293B', borderRadius: 24,
    borderWidth: 1, borderColor: '#EF444440',
    padding: 28, alignItems: 'center', width: '100%',
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#EF444420', borderWidth: 2, borderColor: '#EF444440',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#F1F5F9', marginBottom: 6 },
  sub:   { fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20 },

  countdownWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    paddingHorizontal: 16, paddingVertical: 10, marginBottom: 20,
  },
  countdownLabel: { fontSize: 12, color: '#64748B' },
  countdown:      { fontSize: 20, fontWeight: '800', color: '#F59E0B', fontFamily: 'monospace' },

  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', height: 46,
    backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
  },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  callBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 46, backgroundColor: '#EF4444', borderRadius: 12,
  },
  callText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
