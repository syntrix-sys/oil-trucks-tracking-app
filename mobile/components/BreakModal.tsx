import { useState } from 'react';
import {
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

const BREAK_REASONS = [
  'Rest / Fatigue',
  'Meal Break',
  'Fuel / Refuelling',
  'Vehicle Check / Maintenance',
  'Traffic / Road Block',
  'Police Check',
  'Prayer / Namaz',
  'Medical Emergency',
  'Customer Wait',
  'Other',
];

interface Props {
  visible: boolean;
  onSave: (reason: string, comments: string) => void;
  onCancel: () => void;
}

export default function BreakModal({ visible, onSave, onCancel }: Props) {
  const [reason,   setReason]   = useState('');
  const [comments, setComments] = useState('');

  function handleSave() {
    if (!reason) return;
    onSave(reason, comments);
    setReason('');
    setComments('');
  }

  function handleCancel() {
    setReason('');
    setComments('');
    onCancel();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          <View style={styles.titleRow}>
            <Ionicons name="pause-circle" size={22} color="#F59E0B" />
            <Text style={styles.title}>Take a Break</Text>
          </View>
          <Text style={styles.sub}>Select a reason and optionally add comments.</Text>

          {/* Reason selector */}
          <Text style={styles.label}>Break Reason <Text style={styles.required}>*</Text></Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {BREAK_REASONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.chip, reason === r && styles.chipSelected]}
                onPress={() => setReason(r)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, reason === r && styles.chipTextSelected]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Comments */}
          <Text style={styles.label}>Comments (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={comments}
            onChangeText={setComments}
            placeholder="Add any additional notes…"
            placeholderTextColor="#334155"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, !reason && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!reason}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={reason ? '#0F172A' : '#334155'} />
              <Text style={[styles.saveText, !reason && styles.saveTextDisabled]}>Save & Pause</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#00000080',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: '#334155',
    padding: 20, paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155', alignSelf: 'center', marginBottom: 16,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  title:    { fontSize: 18, fontWeight: '800', color: '#F1F5F9' },
  sub:      { fontSize: 12, color: '#64748B', marginBottom: 16 },

  label:    { fontSize: 11, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  required: { color: '#EF4444' },

  chipsScroll: { gap: 8, paddingBottom: 4, marginBottom: 16, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#0F172A', borderRadius: 20,
    borderWidth: 1, borderColor: '#334155',
  },
  chipSelected: { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' },
  chipText:     { fontSize: 12, color: '#64748B', fontWeight: '600' },
  chipTextSelected: { color: '#F59E0B' },

  textArea: {
    backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
    color: '#F1F5F9', fontSize: 13, padding: 12, minHeight: 80, marginBottom: 20,
  },

  btnRow: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', height: 48,
    backgroundColor: '#0F172A', borderRadius: 12, borderWidth: 1, borderColor: '#334155',
  },
  cancelText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
  saveBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, height: 48, backgroundColor: '#F59E0B', borderRadius: 12,
  },
  saveBtnDisabled: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  saveText: { color: '#0F172A', fontWeight: '800', fontSize: 14 },
  saveTextDisabled: { color: '#334155' },
});
