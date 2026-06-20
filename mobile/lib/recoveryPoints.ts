// Fetches nearby emergency recovery points via the free Overpass API (OpenStreetMap).
// No API key required. Tries multiple mirror endpoints in sequence with per-request timeouts.

export type RecoveryCategory = 'hospital' | 'police' | 'fuel' | 'mechanic' | 'fire_station';

export interface RecoveryPoint {
  id: number;
  name: string;
  category: RecoveryCategory;
  lat: number;
  lng: number;
  distanceKm: number;
  phone?: string;
  address?: string;
}

// Mirror endpoints tried in order — first one to succeed wins
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const REQUEST_TIMEOUT_MS = 18000; // 18s per endpoint attempt
const SEARCH_RADIUS_M    = 15000; // 15 km

// Include both node and way so buildings (hospitals, police) are found too
const CATEGORY_QUERIES: { tag: string; value: string; category: RecoveryCategory }[] = [
  { tag: 'amenity', value: 'hospital',     category: 'hospital'      },
  { tag: 'amenity', value: 'clinic',       category: 'hospital'      },
  { tag: 'healthcare', value: 'hospital',  category: 'hospital'      },
  { tag: 'amenity', value: 'police',       category: 'police'        },
  { tag: 'amenity', value: 'fuel',         category: 'fuel'          },
  { tag: 'shop',    value: 'car_repair',   category: 'mechanic'      },
  { tag: 'amenity', value: 'car_repair',   category: 'mechanic'      },
  { tag: 'amenity', value: 'fire_station', category: 'fire_station'  },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function buildQuery(lat: number, lng: number): string {
  // Query both node (point) and way (building outline) so we catch both styles of OSM mapping.
  // "out center" returns a .center property with lat/lon for way elements.
  const around = `around:${SEARCH_RADIUS_M},${lat},${lng}`;
  const parts: string[] = [];
  for (const { tag, value } of CATEGORY_QUERIES) {
    parts.push(`node["${tag}"="${value}"](${around});`);
    parts.push(`way["${tag}"="${value}"](${around});`);
  }
  return `[out:json][timeout:25];(${parts.join('')});out center tags;`;
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function tryEndpoint(endpoint: string, query: string): Promise<Response> {
  // Try POST first (standard), fall back to GET if it fails
  try {
    const res = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (res.ok) return res;
    throw new Error(`HTTP ${res.status}`);
  } catch {
    // GET fallback — some networks block POST to external APIs
    return fetchWithTimeout(`${endpoint}?data=${encodeURIComponent(query)}`, { method: 'GET' });
  }
}

function resolveCategory(tags: Record<string, string>): RecoveryCategory {
  if (tags.amenity === 'hospital' || tags.amenity === 'clinic' || tags.healthcare === 'hospital') return 'hospital';
  if (tags.amenity === 'police')       return 'police';
  if (tags.amenity === 'fuel')         return 'fuel';
  if (tags.shop === 'car_repair' || tags.amenity === 'car_repair') return 'mechanic';
  if (tags.amenity === 'fire_station') return 'fire_station';
  return 'mechanic';
}

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;   // present on node
  lon?: number;   // present on node
  center?: { lat: number; lon: number }; // present on way/relation with out center
  tags?: Record<string, string>;
};

export async function fetchRecoveryPoints(lat: number, lng: number): Promise<RecoveryPoint[]> {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    throw new Error('Invalid GPS coordinates');
  }

  const query = buildQuery(lat, lng);
  let lastError: unknown;

  for (const endpoint of ENDPOINTS) {
    try {
      const res = await tryEndpoint(endpoint, query);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);

      const json = await res.json();
      const elements: OsmElement[] = json.elements ?? [];

      const seen = new Set<number>();
      const points: RecoveryPoint[] = [];

      for (const el of elements) {
        // Resolve lat/lng — nodes have them directly, ways/relations have a center
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (elLat == null || elLon == null) continue;
        if (seen.has(el.id)) continue;
        seen.add(el.id);

        const tags = el.tags ?? {};
        const category = resolveCategory(tags);
        const distanceKm = haversineKm(lat, lng, elLat, elLon);

        points.push({
          id: el.id,
          name: tags.name || tags['name:en'] || tags['name:ur'] || categoryLabel(category),
          category,
          lat: elLat,
          lng: elLon,
          distanceKm,
          phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || undefined,
          address: tags['addr:street']
            ? `${tags['addr:housenumber'] ?? ''} ${tags['addr:street']}`.trim()
            : tags.road || tags['addr:city'] || undefined,
        });
      }

      return points.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 25);
    } catch (err) {
      lastError = err;
      // try next endpoint
    }
  }

  throw lastError ?? new Error('All Overpass endpoints failed');
}

export function categoryLabel(category: RecoveryCategory): string {
  switch (category) {
    case 'hospital':     return 'Hospital / Clinic';
    case 'police':       return 'Police Station';
    case 'fuel':         return 'Fuel Station';
    case 'mechanic':     return 'Vehicle Repair';
    case 'fire_station': return 'Fire Station';
  }
}

export function categoryIcon(category: RecoveryCategory): string {
  switch (category) {
    case 'hospital':     return 'medkit-outline';
    case 'police':       return 'shield-checkmark-outline';
    case 'fuel':         return 'flame-outline';
    case 'mechanic':     return 'construct-outline';
    case 'fire_station': return 'alert-circle-outline';
  }
}

export function categoryColor(category: RecoveryCategory): string {
  switch (category) {
    case 'hospital':     return '#EF4444';
    case 'police':       return '#3B82F6';
    case 'fuel':         return '#F59E0B';
    case 'mechanic':     return '#22C55E';
    case 'fire_station': return '#F97316';
  }
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}
