// Screen 00: CNIC Authentication
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { formatCnic, getDriverByCnic, saveSession, validateCnic } from '@/lib/auth';

export default function AuthScreen() {
  const [cnic, setCnic]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function handleCnicChange(raw: string) {
    setError('');
    // Strip non-digits, max 13 digits
    const digits = raw.replace(/\D/g, '').slice(0, 13);
    setCnic(formatCnic(digits));
  }

  async function handleLogin() {
    if (!validateCnic(cnic)) {
      setError('Invalid CNIC or not registered as a driver. Format: XXXXX-XXXXXXX-X');
      return;
    }
    setLoading(true);
    const driver = getDriverByCnic(cnic);
    if (!driver) {
      setError('Driver not found.');
      setLoading(false);
      return;
    }
    await saveSession(driver);
    router.replace('/orders');
  }

  const isComplete = /^\d{5}-\d{7}-\d$/.test(cnic);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="flame" size={32} color="#F59E0B" />
          </View>
          <Text style={styles.appName}>OilTrack Pro</Text>
          <Text style={styles.appSub}>DRIVER LOGIN</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enter Your CNIC</Text>
          <Text style={styles.cardDesc}>
            Your National Identity Card number is your secure login identifier.
          </Text>

          <View style={[styles.inputWrap, error ? styles.inputError : null]}>
            <Ionicons name="card-outline" size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="XXXXX-XXXXXXX-X"
              placeholderTextColor="#334155"
              keyboardType="numeric"
              value={cnic}
              onChangeText={handleCnicChange}
              maxLength={15}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            {isComplete && (
              <Ionicons name="checkmark-circle" size={20} color="#22C55E" style={{ marginRight: 12 }} />
            )}
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, (!isComplete || loading) && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={!isComplete || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.btnText}>Verifying…</Text>
            ) : (
              <>
                <Ionicons name="log-in-outline" size={18} color="#0F172A" />
                <Text style={styles.btnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.hint}>
            <Ionicons name="information-circle-outline" size={13} color="#475569" />
            <Text style={styles.hintText}>
              Demo CNICs: 35202-1234567-9 · 42101-9876543-1 · 36302-5678901-2
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  kav:  { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },

  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#F59E0B40',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#F1F5F9', letterSpacing: 0.5 },
  appSub:  { fontSize: 10, fontWeight: '700', color: '#475569', letterSpacing: 3, marginTop: 3 },

  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
  },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#F1F5F9', marginBottom: 6 },
  cardDesc:  { fontSize: 13, color: '#64748B', lineHeight: 18, marginBottom: 20 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    height: 52,
    marginBottom: 12,
  },
  inputError: { borderColor: '#EF4444' },
  inputIcon:  { marginLeft: 14, marginRight: 8 },
  input: {
    flex: 1,
    color: '#F1F5F9',
    fontSize: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    letterSpacing: 1,
  },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#EF444415',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF444430',
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: '#EF4444', fontSize: 12, flex: 1, lineHeight: 16 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 12,
    height: 50,
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { color: '#0F172A', fontWeight: '800', fontSize: 15 },

  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 16,
  },
  hintText: { color: '#475569', fontSize: 11, flex: 1, lineHeight: 15 },
});
