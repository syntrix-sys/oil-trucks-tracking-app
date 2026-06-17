// Screen 1: Delivery Order (DO) List
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { clearSession, loadSession, type DriverSession } from '@/lib/auth';
import { getOrdersForVehicle, type DeliveryOrder } from '@/constants/mockOrders';
import EmergencyButton from '@/components/EmergencyButton';

export default function OrdersScreen() {
  const [session, setSession] = useState<DriverSession | null>(null);
  const [orders,  setOrders]  = useState<DeliveryOrder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    loadSession().then((s) => {
      if (!s) { router.replace('/auth'); return; }
      setSession(s);
      const list = getOrdersForVehicle(s.vehicleId);
      setOrders(list);
      // Pre-set active order if one exists
      const active = list.find((o) => o.status === 'active');
      if (active) setActiveId(active.id);
    });
  }, []);

  async function handleLogout() {
    await clearSession();
    router.replace('/auth');
  }

  function startTrip(order: DeliveryOrder) {
    setActiveId(order.id);
    router.push({ pathname: '/journey', params: { orderId: order.id, vehicleId: session?.vehicleId } });
  }

  const cargoColors: Record<string, string> = {
    'HSD Diesel':          '#3B82F6',
    'Petrol RON-92':       '#22C55E',
    'Petrol RON-95':       '#10B981',
    'Aviation Fuel JET-A1':'#8B5CF6',
    'Engine Oil (Bulk)':   '#F59E0B',
    'Kerosene':            '#F97316',
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <View>
          <Text style={styles.greeting}>Hello, {session?.name?.split(' ')[0] ?? '…'}</Text>
          <Text style={styles.vehicle}>{session?.vehicleId ?? '—'}</Text>
        </View>
        <View style={styles.topbarRight}>
          <EmergencyButton compact phone={session?.phone} />
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
            <Ionicons name="log-out-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Section header */}
      <View style={styles.sectionHeader}>
        <Ionicons name="document-text-outline" size={16} color="#F59E0B" />
        <Text style={styles.sectionTitle}>Delivery Orders</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{orders.length}</Text>
        </View>
      </View>

      {activeId && (
        <TouchableOpacity
          style={styles.resumeBanner}
          onPress={() => router.push({ pathname: '/journey', params: { orderId: activeId, vehicleId: session?.vehicleId } })}
          activeOpacity={0.85}
        >
          <Ionicons name="navigate-circle" size={18} color="#22C55E" />
          <Text style={styles.resumeText}>Trip in progress — tap to resume</Text>
          <Ionicons name="chevron-forward" size={16} color="#22C55E" />
        </TouchableOpacity>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {orders.map((order) => {
          const isActive    = activeId === order.id;
          const isOtherActive = activeId !== null && activeId !== order.id;
          const accentColor = cargoColors[order.cargo] ?? '#64748B';

          return (
            <View key={order.id} style={[styles.card, isActive && styles.cardActive]}>
              {/* Top strip */}
              <View style={[styles.cardStrip, { backgroundColor: accentColor }]} />

              <View style={styles.cardBody}>
                <View style={styles.cardRow}>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <View style={[styles.statusPill, { backgroundColor: order.status === 'active' ? '#22C55E20' : '#1E293B' }]}>
                    <Text style={[styles.statusText, { color: order.status === 'active' ? '#22C55E' : '#64748B' }]}>
                      {order.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <View style={styles.cargoRow}>
                  <View style={[styles.cargoIcon, { backgroundColor: `${accentColor}20` }]}>
                    <Ionicons name="water-outline" size={16} color={accentColor} />
                  </View>
                  <View>
                    <Text style={styles.cargoLabel}>{order.cargo}</Text>
                    <Text style={styles.cargoQty}>{order.quantityLiters.toLocaleString()} L</Text>
                  </View>
                </View>

                <View style={styles.routeBox}>
                  <RouteRow icon="radio-button-on-outline" color="#3B82F6" label="Pickup" value={order.pickupLocation} />
                  <View style={styles.routeDivider} />
                  <RouteRow icon="location-outline" color="#EF4444" label="Drop-off" value={order.dropLocation} />
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{order.scheduledDate}</Text>
                </View>

                {/* Start Trip button */}
                {order.status !== 'completed' && (
                  <TouchableOpacity
                    style={[
                      styles.startBtn,
                      isActive       && styles.startBtnActive,
                      isOtherActive  && styles.startBtnDisabled,
                    ]}
                    onPress={() => !isOtherActive && startTrip(order)}
                    disabled={isOtherActive}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isActive ? 'navigate-circle-outline' : 'play-circle-outline'}
                      size={16}
                      color={isOtherActive ? '#334155' : isActive ? '#22C55E' : '#0F172A'}
                    />
                    <Text style={[styles.startBtnText, isActive && styles.startBtnTextActive, isOtherActive && styles.startBtnTextDisabled]}>
                      {isActive ? 'Resume Journey' : isOtherActive ? 'Trip in Progress' : 'Start Trip'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteRow({ icon, color, label, value }: { icon: string; color: string; label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
      <Ionicons name={icon as any} size={13} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, color: '#64748B', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
        <Text style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 16 }}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },

  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#1E293B',
  },
  topbarRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  greeting:     { fontSize: 15, fontWeight: '700', color: '#F1F5F9' },
  vehicle:      { fontSize: 11, color: '#F59E0B', fontWeight: '600', marginTop: 1 },
  logoutBtn:    { padding: 6 },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#94A3B8', flex: 1, textTransform: 'uppercase', letterSpacing: 1 },
  badge: { backgroundColor: '#F59E0B20', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: '#F59E0B', fontSize: 11, fontWeight: '700' },

  resumeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#22C55E15', borderRadius: 12, borderWidth: 1, borderColor: '#22C55E30',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  resumeText: { color: '#22C55E', fontSize: 13, fontWeight: '600', flex: 1 },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 12 },

  card: {
    backgroundColor: '#1E293B', borderRadius: 16, borderWidth: 1, borderColor: '#334155', overflow: 'hidden',
  },
  cardActive: { borderColor: '#22C55E40' },
  cardStrip:  { height: 3 },
  cardBody:   { padding: 14, gap: 10 },

  cardRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  orderNumber:  { fontSize: 12, fontWeight: '700', color: '#94A3B8', fontFamily: 'monospace' },
  statusPill:   { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 9, fontWeight: '800', letterSpacing: 1 },

  cargoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cargoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cargoLabel:{ fontSize: 14, fontWeight: '700', color: '#F1F5F9' },
  cargoQty:  { fontSize: 12, color: '#64748B', marginTop: 1 },

  routeBox:    { backgroundColor: '#0F172A', borderRadius: 10, padding: 10, gap: 6 },
  routeDivider:{ height: 1, backgroundColor: '#1E293B', marginVertical: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:{ fontSize: 11, color: '#64748B' },

  startBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F59E0B', borderRadius: 10, height: 44, marginTop: 2,
  },
  startBtnActive:   { backgroundColor: '#22C55E20', borderWidth: 1, borderColor: '#22C55E50' },
  startBtnDisabled: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  startBtnText:         { color: '#0F172A', fontWeight: '800', fontSize: 14 },
  startBtnTextActive:   { color: '#22C55E' },
  startBtnTextDisabled: { color: '#334155' },
});
