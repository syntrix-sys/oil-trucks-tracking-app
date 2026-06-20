// Reverse geocoding via OpenStreetMap Nominatim — free, no API key.
// Coordinates are rounded to 2 decimal places (~1 km grid) before caching
// so nearby positions share cache hits and we stay well within the 1 req/s limit.

const NOMINATIM = "https://nominatim.openstreetmap.org/reverse";
const CACHE_MAX = 150;

const cache = new Map<string, string>();

function cacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function evictIfNeeded() {
  if (cache.size >= CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key)!;

  try {
    const res = await fetch(
      `${NOMINATIM}?lat=${lat}&lon=${lng}&format=json&zoom=14&addressdetails=1`,
      { headers: { "Accept-Language": "en", "User-Agent": "OilTrackPro/1.0" } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const addr = data.address ?? {};
    // Build a short 2-part label: neighbourhood/suburb + city, or road + city
    const parts: string[] = [];
    const area = addr.suburb ?? addr.neighbourhood ?? addr.village ?? addr.town ?? addr.road ?? addr.county;
    const city = addr.city ?? addr.state_district ?? addr.state;
    if (area) parts.push(area);
    if (city && city !== area) parts.push(city);
    const label = parts.length ? parts.join(", ") : (data.display_name?.split(",").slice(0, 2).join(",").trim() ?? "Unknown location");

    evictIfNeeded();
    cache.set(key, label);
    return label;
  } catch {
    const fallback = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    evictIfNeeded();
    cache.set(key, fallback);
    return fallback;
  }
}
