import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendLoadEntry, fetchLoadHistory, type LoadEntry } from '@/lib/api';

interface Props {
  visible: boolean;
  vehicleId: string;
  tankCapacityLiters: number;
  currentLiters: number;
  onClose: () => void;
  onSynced: (liters: number) => void;
}

const STEP = 500;

function fillColor(percent: number): string {
  if (percent >= 95) return '#EF4444';
  if (percent >= 80) return '#F59E0B';
  return '#22C55E';
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return iso;
  }
}

export default function LoadManagementScreen({
  visible,
  vehicleId,
  tankCapacityLiters,
  currentLiters,
  onClose,
  onSynced,
}: Props) {
  const [liters, setLiters]     = useState(currentLiters);
  const [input, setInput]       = useState(String(Math.round(currentLiters)));
  const [note, setNote]         = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState('');
  const [history, setHistory]   = useState<LoadEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sync prop → local state when modal opens
  useEffect(() => {
    if (!visible) return;
    setLiters(currentLiters);
    setInput(String(Math.round(currentLiters)));
    setNote('');
    setSaveError('');
    loadHistory();
  }, [visible]);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const entries = await fetchLoadHistory(vehicleId);
      setHistory(entries);
    } catch {
      // silently ignore — history is a nice-to-have
    } finally {
      setLoadingHistory(false);
    }
  }

  function applyInput(raw: string) {
    setInput(raw);
    const n = parseFloat(raw);
    if (!isNaN(n) && n >= 0 && n <= tankCapacityLiters) {
      setLiters(n);
    }
  }

  function adjustLiters(delta: number) {
    const next = Math.max(0, Math.min(tankCapacityLiters, liters + delta));
    setLiters(next);
    setInput(String(Math.round(next)));
  }

  async function handleSave() {
    const rounded = Math.round(liters);
    if (isNaN(rounded) || rounded < 0) return;
    setSaving(true);
    setSaveError('');
    try {
      const entry = await sendLoadEntry(vehicleId, rounded, note.trim() || undefined);
      onSynced(rounded);
      setHistory((prev) => [entry, ...prev]);
      setNote('');
    } catch {
      setSaveError('Sync failed. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  const percent = tankCapacityLiters > 0 ? Math.min(100, (liters / tankCapacityLiters) * 100) : 0;
  const color = fillColor(percent);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Ionicons name="water" size={20} color="#F59E0B" />
              <Text style={styles.title}>Load Management</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.vehicleLabel}>{vehicleId} · Capacity: {tankCapacityLiters.toLocaleString()} L</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Fill Level Bar ── */}
            <View style={styles.section}>
              <View style={styles.fillHeader}>
                <Text style={styles.sectionLabel}>Fill Level</Text>
                <Text style={[styles.fillPercent, { color }]}>{percent.toFixed(1)}%</Text>
              </View>

              <View style={styles.fillTrack}>
                <View style={[styles.fillBar, { width: `${percent}%` as any, backgroundColor: color }]} />
              </View>

              <View style={styles.fillLegend}>
                <Text style={styles.legendText}>0 L</Text>
                <Text style={[styles.fillValue, { color }]}>{Math.round(liters).toLocaleString()} L</Text>
                <Text style={styles.legendText}>{tankCapacityLiters.toLocaleString()} L</Text>
              </View>

              {percent >= 95 && (
                <View style={styles.warningBanner}>
                  <Ionicons name="warning-outline" size={13} color="#EF4444" />
                  <Text style={styles.warningText}>Tank near capacity — verify before loading more</Text>
                </View>
              )}
              {percent >= 80 && percent < 95 && (
                <View style={[styles.warningBanner, styles.cautionBanner]}>
                  <Ionicons name="information-circle-outline" size={13} color="#F59E0B" />
                  <Text style={[styles.warningText, { color: '#F59E0B' }]}>Tank above 80% — approaching capacity</Text>
                </View>
              )}
            </View>

            {/* ── Quick Entry ── */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Update Load</Text>

              {/* ± Stepper + text input */}
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustLiters(-STEP)} activeOpacity={0.8}>
                  <Ionicons name="remove" size={20} color="#F59E0B" />
                </TouchableOpacity>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.litersInput}
                    value={input}
                    onChangeText={applyInput}
                    keyboardType="numeric"
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <Text style={styles.inputUnit}>L</Text>
                </View>

                <TouchableOpacity style={styles.stepBtn} onPress={() => adjustLiters(+STEP)} activeOpacity={0.8}>
                  <Ionicons name="add" size={20} color="#F59E0B" />
                </TouchableOpacity>
              </View>

              <Text style={styles.stepHint}>Tap ± to adjust by {STEP.toLocaleString()} L, or type an exact value</Text>

              {/* Note field */}
              <Text style={styles.noteLabel}>Note (optional)</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Partial load — pump issue at source"
                placeholderTextColor="#334155"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                maxLength={200}
              />

              {saveError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={13} color="#EF4444" />
                  <Text style={styles.errorText}>{saveError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#0F172A" />
                ) : (
                  <Ionicons name="cloud-upload-outline" size={17} color="#0F172A" />
                )}
                <Text style={styles.saveBtnText}>{saving ? 'Syncing…' : 'Save & Sync'}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Load History ── */}
            <View style={styles.section}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionLabel}>Load History</Text>
                {loadingHistory && <ActivityIndicator size="small" color="#64748B" />}
              </View>

              {history.length === 0 && !loadingHistory ? (
                <Text style={styles.emptyText}>No load entries recorded yet for this trip.</Text>
              ) : (
                history.map((entry, i) => (
                  <View key={entry.id} style={[styles.historyRow, i < history.length - 1 && styles.historyRowBorder]}>
                    <View style={styles.historyLeft}>
                      <Text style={styles.historyLiters}>{Math.round(entry.totalLiters).toLocaleString()} L</Text>
                      {entry.note ? <Text style={styles.historyNote}>{entry.note}</Text> : null}
                    </View>
                    <View style={styles.historyRight}>
                      <Text style={styles.historyTime}>{formatTs(entry.timestamp)}</Text>
                      {entry.syncedFromMobile && (
                        <View style={styles.mobileBadge}>
                          <Ionicons name="phone-portrait-outline" size={9} color="#3B82F6" />
                          <Text style={styles.mobileBadgeText}>Mobile</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: '#334155',
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 32,
    maxHeight: '90%',
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155', alignSelf: 'center', marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 2,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title:       { fontSize: 17, fontWeight: '800', color: '#F1F5F9' },
  closeBtn:    { padding: 4 },
  vehicleLabel:{ fontSize: 11, color: '#64748B', marginBottom: 16 },

  scroll: { gap: 12, paddingBottom: 8 },

  section: {
    backgroundColor: '#0F172A', borderRadius: 16,
    borderWidth: 1, borderColor: '#334155', padding: 14,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: '700', color: '#64748B',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12,
  },

  // Fill bar
  fillHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fillPercent: { fontSize: 16, fontWeight: '800' },
  fillTrack:   { height: 12, backgroundColor: '#1E293B', borderRadius: 6, overflow: 'hidden', marginBottom: 6 },
  fillBar:     { height: '100%', borderRadius: 6 },
  fillLegend:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  legendText:  { fontSize: 10, color: '#475569' },
  fillValue:   { fontSize: 20, fontWeight: '800' },
  warningBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#EF444415', borderRadius: 8,
    borderWidth: 1, borderColor: '#EF444430',
    paddingHorizontal: 10, paddingVertical: 6,
  },
  cautionBanner: { backgroundColor: '#F59E0B15', borderColor: '#F59E0B30' },
  warningText: { fontSize: 11, color: '#EF4444', flex: 1, lineHeight: 15 },

  // Stepper
  stepperRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
    alignItems: 'center', justifyContent: 'center',
  },
  inputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 1, borderColor: '#475569',
    paddingHorizontal: 12, height: 44,
  },
  litersInput: {
    flex: 1, color: '#F1F5F9', fontSize: 20, fontWeight: '700', fontFamily: 'monospace',
  },
  inputUnit: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  stepHint:  { fontSize: 10, color: '#475569', textAlign: 'center', marginBottom: 14 },

  // Note
  noteLabel: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  noteInput: {
    backgroundColor: '#1E293B', borderRadius: 10, borderWidth: 1, borderColor: '#334155',
    color: '#F1F5F9', fontSize: 13, padding: 10, minHeight: 60, marginBottom: 12,
  },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#EF444415', borderRadius: 8, borderWidth: 1, borderColor: '#EF444430',
    padding: 10, marginBottom: 12,
  },
  errorText: { color: '#EF4444', fontSize: 12, flex: 1, lineHeight: 16 },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F59E0B', borderRadius: 12, height: 48,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#0F172A', fontWeight: '800', fontSize: 15 },

  // History
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  emptyText:     { fontSize: 12, color: '#475569', textAlign: 'center', paddingVertical: 8 },
  historyRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 10,
  },
  historyRowBorder: { borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  historyLeft:  { flex: 1 },
  historyLiters:{ fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  historyNote:  { fontSize: 11, color: '#64748B', marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  historyTime:  { fontSize: 10, color: '#64748B' },
  mobileBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#3B82F615', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  mobileBadgeText: { fontSize: 9, color: '#3B82F6', fontWeight: '700' },
});
