import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import {
  fetchRecoveryPoints,
  categoryColor,
  categoryIcon,
  categoryLabel,
  formatDistance,
  type RecoveryPoint,
  type RecoveryCategory,
} from '@/lib/recoveryPoints';

const { height: SCREEN_H } = Dimensions.get('window');
const MAP_HEIGHT = Math.round(SCREEN_H * 0.42);

interface Props {
  visible: boolean;
  driverLat: number | null;
  driverLng: number | null;
  onClose: () => void;
}

type FilterCategory = RecoveryCategory | 'all';

const FILTERS: { key: FilterCategory; label: string }[] = [
  { key: 'all',          label: 'All'     },
  { key: 'hospital',     label: 'Medical' },
  { key: 'police',       label: 'Police'  },
  { key: 'mechanic',     label: 'Repair'  },
  { key: 'fuel',         label: 'Fuel'    },
  { key: 'fire_station', label: 'Fire'    },
];

function openDirections(lat: number, lng: number, name: string) {
  const encoded = encodeURIComponent(name);
  const nativeUrl = Platform.select({
    ios:     `maps://app?daddr=${lat},${lng}&dirflg=d`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encoded})`,
  });
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  if (nativeUrl) {
    Linking.canOpenURL(nativeUrl).then((ok) =>
      Linking.openURL(ok ? nativeUrl : webUrl)
    );
  } else {
    Linking.openURL(webUrl);
  }
}

function callNumber(phone: string) {
  Linking.openURL(`tel:${phone.replace(/\s/g, '')}`);
}

function calcRegion(lat: number, lng: number, points: RecoveryPoint[]) {
  if (points.length === 0) {
    return { latitude: lat, longitude: lng, latitudeDelta: 0.12, longitudeDelta: 0.12 };
  }
  const lats = [lat, ...points.map((p) => p.lat)];
  const lngs = [lng, ...points.map((p) => p.lng)];
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude:      (minLat + maxLat) / 2,
    longitude:     (minLng + maxLng) / 2,
    latitudeDelta:  Math.max(maxLat - minLat, 0.02) * 1.4,
    longitudeDelta: Math.max(maxLng - minLng, 0.02) * 1.4,
  };
}

export default function RecoveryPointsModal({ visible, driverLat, driverLng, onClose }: Props) {
  const mapRef  = useRef<MapView>(null);
  const [points,    setPoints]    = useState<RecoveryPoint[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [filter,    setFilter]    = useState<FilterCategory>('all');
  const [selected,  setSelected]  = useState<RecoveryPoint | null>(null);
  const [mapReady,  setMapReady]  = useState(false);

  // Derived state — declared before any useEffect that references them
  const displayed =
    filter === 'all'
      ? points
      : points.filter((p) => p.category === filter);

  const hasGps = driverLat != null && driverLng != null;

  useEffect(() => {
    if (!visible || driverLat == null || driverLng == null) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSelected(null);
    setFilter('all');
    setPoints([]);

    fetchRecoveryPoints(driverLat, driverLng)
      .then((pts) => { if (!cancelled) setPoints(pts); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn('[RecoveryPoints] fetch failed:', msg);
        if (!cancelled) setError(`Search failed: ${msg}`);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [visible, driverLat, driverLng]);

  // Fit map to show all visible markers after load
  useEffect(() => {
    if (!mapReady || !driverLat || !driverLng || displayed.length === 0) return;
    const coords = [
      { latitude: driverLat, longitude: driverLng },
      ...displayed.map((p) => ({ latitude: p.lat, longitude: p.lng })),
    ];
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 120, left: 40 },
      animated: true,
    });
  }, [mapReady, displayed.length, driverLat, driverLng]);

  function retry() {
    if (!hasGps) return;
    setLoading(true);
    setError('');
    fetchRecoveryPoints(driverLat!, driverLng!)
      .then(setPoints)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Search failed: ${msg}`);
      })
      .finally(() => setLoading(false));
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="warning-outline" size={17} color="#EF4444" />
              </View>
              <View>
                <Text style={styles.title}>Recovery Points</Text>
                <Text style={styles.subtitle}>Nearest emergency help · 15 km radius</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* ── No GPS ── */}
          {!hasGps ? (
            <View style={styles.centerState}>
              <Ionicons name="locate-outline" size={48} color="#334155" />
              <Text style={styles.stateTitle}>No GPS Signal</Text>
              <Text style={styles.stateSub}>Enable Location Services and try again.</Text>
            </View>

          /* ── Loading ── */
          ) : loading ? (
            <View style={styles.centerState}>
              <ActivityIndicator size="large" color="#EF4444" />
              <Text style={styles.stateTitle}>Searching nearby…</Text>
              <Text style={styles.stateSub}>Querying OpenStreetMap within 15 km</Text>
            </View>

          /* ── Error ── */
          ) : error ? (
            <View style={styles.centerState}>
              <Ionicons name="cloud-offline-outline" size={48} color="#334155" />
              <Text style={styles.stateTitle}>Search Failed</Text>
              <Text style={styles.stateSub}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={retry} activeOpacity={0.8}>
                <Ionicons name="refresh-outline" size={15} color="#0F172A" />
                <Text style={styles.retryBtnText}>Try Again</Text>
              </TouchableOpacity>
            </View>

          /* ── Map view ── */
          ) : (
            <>
              {/* Filter chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {FILTERS.map(({ key, label }) => {
                  const count = key === 'all'
                    ? points.length
                    : points.filter((p) => p.category === key).length;
                  if (key !== 'all' && count === 0) return null;
                  const active = filter === key;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => { setFilter(key); setSelected(null); }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Map */}
              <View style={styles.mapWrap}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  initialRegion={calcRegion(driverLat!, driverLng!, displayed)}
                  onMapReady={() => setMapReady(true)}
                  showsUserLocation={false}
                  showsMyLocationButton={false}
                >
                  {/* Driver pin */}
                  <Marker
                    coordinate={{ latitude: driverLat!, longitude: driverLng! }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    zIndex={99}
                  >
                    <View style={styles.driverPin}>
                      <View style={styles.driverPinInner} />
                    </View>
                  </Marker>

                  {/* Recovery point pins */}
                  {displayed.map((point) => {
                    const color  = categoryColor(point.category);
                    const icon   = categoryIcon(point.category);
                    const isSel  = selected?.id === point.id;
                    return (
                      <Marker
                        key={point.id}
                        coordinate={{ latitude: point.lat, longitude: point.lng }}
                        anchor={{ x: 0.5, y: 1 }}
                        zIndex={isSel ? 10 : 1}
                        onPress={() => setSelected(isSel ? null : point)}
                      >
                        <View style={[
                          styles.pin,
                          { backgroundColor: color, borderColor: color },
                          isSel && styles.pinSelected,
                        ]}>
                          <Ionicons name={icon as any} size={isSel ? 14 : 11} color="#fff" />
                        </View>
                        <View style={[styles.pinTail, { borderTopColor: color }]} />
                      </Marker>
                    );
                  })}
                </MapView>

                {/* No results overlay */}
                {displayed.length === 0 && (
                  <View style={styles.noResultsOverlay}>
                    <Text style={styles.noResultsText}>No results within 15 km</Text>
                  </View>
                )}

                {/* Driver location legend */}
                <View style={styles.legend}>
                  <View style={styles.legendDot} />
                  <Text style={styles.legendText}>Your location</Text>
                </View>
              </View>

              {/* Selected point info card */}
              {selected ? (
                <View style={[styles.infoCard, { borderLeftColor: categoryColor(selected.category) }]}>
                  <View style={[styles.infoIcon, { backgroundColor: categoryColor(selected.category) + '25' }]}>
                    <Ionicons name={categoryIcon(selected.category) as any} size={20} color={categoryColor(selected.category)} />
                  </View>
                  <View style={styles.infoBody}>
                    <Text style={styles.infoName} numberOfLines={1}>{selected.name}</Text>
                    <Text style={[styles.infoType, { color: categoryColor(selected.category) }]}>
                      {categoryLabel(selected.category)} · {formatDistance(selected.distanceKm)}
                    </Text>
                    {selected.address ? (
                      <Text style={styles.infoAddress} numberOfLines={1}>{selected.address}</Text>
                    ) : null}
                    <View style={styles.infoActions}>
                      <TouchableOpacity
                        style={styles.dirBtn}
                        onPress={() => openDirections(selected.lat, selected.lng, selected.name)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="navigate-outline" size={14} color="#0F172A" />
                        <Text style={styles.dirBtnText}>Get Directions</Text>
                      </TouchableOpacity>
                      {selected.phone ? (
                        <TouchableOpacity
                          style={styles.callBtn}
                          onPress={() => callNumber(selected.phone!)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="call-outline" size={14} color="#22C55E" />
                          <Text style={styles.callBtnText}>Call</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.tapHint}>
                  <Ionicons name="hand-left-outline" size={13} color="#475569" />
                  <Text style={styles.tapHintText}>Tap a pin on the map for details and directions</Text>
                </View>
              )}

              <Text style={styles.attribution}>© OpenStreetMap contributors</Text>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0, borderColor: '#334155',
    paddingTop: 12, maxHeight: '95%',
  },

  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#334155', alignSelf: 'center', marginBottom: 14,
  },

  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 18, marginBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444430',
    alignItems: 'center', justifyContent: 'center',
  },
  title:    { fontSize: 15, fontWeight: '800', color: '#F1F5F9' },
  subtitle: { fontSize: 10, color: '#64748B', marginTop: 1 },
  closeBtn: { padding: 4 },

  // Filter chips
  filterRow: { paddingHorizontal: 16, paddingBottom: 10, gap: 7 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155',
  },
  chipActive:     { backgroundColor: '#EF444420', borderColor: '#EF4444' },
  chipText:       { fontSize: 11, fontWeight: '600', color: '#64748B' },
  chipTextActive: { color: '#EF4444' },

  // Map
  mapWrap: { position: 'relative', height: MAP_HEIGHT, marginHorizontal: 0 },
  map:     { flex: 1 },

  // Driver marker
  driverPin: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#3B82F630', borderWidth: 2, borderColor: '#3B82F6',
    alignItems: 'center', justifyContent: 'center',
  },
  driverPinInner: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6',
  },

  // Recovery point marker
  pin: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4, shadowRadius: 3, elevation: 5,
  },
  pinSelected: {
    width: 36, height: 36, borderRadius: 18,
  },
  pinTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    alignSelf: 'center', marginTop: -1,
  },

  // Legend
  legend: {
    position: 'absolute', top: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#0F172ACC', borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5,
  },
  legendDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#3B82F6', borderWidth: 2, borderColor: '#fff' },
  legendText: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },

  // No results overlay
  noResultsOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#0F172A88',
  },
  noResultsText: { fontSize: 14, fontWeight: '700', color: '#F1F5F9' },

  // Selected info card
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    marginHorizontal: 14, marginTop: 10,
    backgroundColor: '#0F172A', borderRadius: 14,
    borderWidth: 1, borderColor: '#334155', borderLeftWidth: 3,
    padding: 12,
  },
  infoIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoBody: { flex: 1 },
  infoName: { fontSize: 14, fontWeight: '800', color: '#F1F5F9', marginBottom: 1 },
  infoType: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 },
  infoAddress: { fontSize: 10, color: '#475569', marginBottom: 8 },
  infoActions: { flexDirection: 'row', gap: 8 },

  dirBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F59E0B', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7,
  },
  dirBtnText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#22C55E15', borderRadius: 9, borderWidth: 1, borderColor: '#22C55E40',
    paddingHorizontal: 12, paddingVertical: 7,
  },
  callBtnText: { fontSize: 12, fontWeight: '700', color: '#22C55E' },

  // Tap hint
  tapHint: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 10, paddingVertical: 10,
  },
  tapHintText: { fontSize: 11, color: '#475569' },

  attribution: { fontSize: 9, color: '#334155', textAlign: 'center', paddingBottom: 20, marginTop: 4 },

  // Center states (loading / error / no gps)
  centerState: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 56, paddingHorizontal: 32, gap: 12,
  },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#F1F5F9' },
  stateSub:   { fontSize: 12, color: '#64748B', textAlign: 'center', lineHeight: 18 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F59E0B', borderRadius: 10,
    paddingHorizontal: 18, paddingVertical: 10, marginTop: 8,
  },
  retryBtnText: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
});
