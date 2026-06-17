import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  warningAt: number;
  criticalAt: number;
  icon: string;
  invertColors?: boolean; // for fuel: low is bad
}

export default function TelemetryGauge({
  label, value, unit, min, max,
  warningAt, criticalAt, icon, invertColors = false,
}: Props) {
  const pct = Math.min(Math.max((value - min) / (max - min), 0), 1);

  let color = '#22C55E'; // normal (green)
  if (!invertColors) {
    if (value >= criticalAt) color = '#EF4444';
    else if (value >= warningAt) color = '#F59E0B';
  } else {
    // Inverted: low value is bad (fuel)
    if (value <= criticalAt) color = '#EF4444';
    else if (value <= warningAt) color = '#F59E0B';
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Ionicons name={icon as any} size={12} color={color} />
        <Text style={styles.label}>{label}</Text>
      </View>

      <Text style={[styles.value, { color }]}>
        {value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}
        <Text style={styles.unit}> {unit}</Text>
      </Text>

      {/* Bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '47%',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 12,
    gap: 6,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  label:  { fontSize: 9, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  value:  { fontSize: 22, fontWeight: '800' },
  unit:   { fontSize: 11, fontWeight: '500', color: '#64748B' },
  barBg: {
    height: 4, backgroundColor: '#1E293B', borderRadius: 2, overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 2 },
});
