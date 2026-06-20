// Reverse geocoding via OpenStreetMap Nominatim — free, no API key required.
// Coords rounded to 2dp (~1 km grid) for cache deduplication.

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
const CACHE_MAX = 100;

const cache = new Map<string, string>();

function key(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const k = key(lat, lng);
  if (cache.has(k)) return cache.get(k)!;

  try {
    const res = await fetch(
      `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'OilTrackPro/1.0' } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const addr = data.address ?? {};
    const parts: string[] = [];
    const area = addr.suburb ?? addr.neighbourhood ?? addr.village ?? addr.town ?? addr.road ?? addr.county;
    const city = addr.city ?? addr.state_district ?? addr.state;
    if (area) parts.push(area);
    if (city && city !== area) parts.push(city);
    const label = parts.length
      ? parts.join(', ')
      : (data.display_name?.split(',').slice(0, 2).join(',').trim() ?? 'Unknown location');

    if (cache.size >= CACHE_MAX) {
      const first = cache.keys().next().value;
      if (first !== undefined) cache.delete(first);
    }
    cache.set(k, label);
    return label;
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}
