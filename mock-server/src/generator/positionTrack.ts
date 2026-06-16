import seedrandom from "seedrandom";
import { LatLng } from "@oiltrack/types";

export const TOTAL_TICKS = 1800;
export const TICK_SECONDS = 2;
const SEGMENT_SPACING_KM = 0.25; // ~250m

const R_EARTH_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function haversineDistanceKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R_EARTH_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bearingDegrees(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLng = toRad(b.lng - a.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

export interface TrackPoint extends LatLng {
  bearing: number;
  cumulativeDistanceKm: number;
}

/** Interpolate ~250m-spaced points between consecutive anchor waypoints (§7.2). */
export function buildRouteTrack(anchors: LatLng[]): TrackPoint[] {
  const points: { lat: number; lng: number; cumulativeDistanceKm: number }[] = [];
  let running = 0;

  for (let i = 0; i < anchors.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const segDistance = haversineDistanceKm(a, b);
    const numPoints = Math.max(1, Math.round(segDistance / SEGMENT_SPACING_KM));

    for (let j = 0; j < numPoints; j++) {
      const f = j / numPoints;
      points.push({
        lat: a.lat + (b.lat - a.lat) * f,
        lng: a.lng + (b.lng - a.lng) * f,
        cumulativeDistanceKm: running + f * segDistance,
      });
    }
    running += segDistance;
  }

  const last = anchors[anchors.length - 1];
  points.push({ lat: last.lat, lng: last.lng, cumulativeDistanceKm: running });

  // Compute bearing for each point (toward next point; last reuses previous).
  const track: TrackPoint[] = points.map((p, i) => {
    const next = points[Math.min(i + 1, points.length - 1)];
    const bearing = i < points.length - 1 ? bearingDegrees(p, next) : 0;
    return { ...p, bearing };
  });
  if (track.length > 1) track[track.length - 1].bearing = track[track.length - 2].bearing;

  return track;
}

export function totalDistanceKm(track: TrackPoint[]): number {
  return track[track.length - 1].cumulativeDistanceKm;
}

/** Linear-interpolate a position + bearing at a given cumulative distance along the track. */
export function pointAtDistance(track: TrackPoint[], distanceKm: number): { lat: number; lng: number; bearing: number } {
  const total = totalDistanceKm(track);
  const d = Math.max(0, Math.min(distanceKm, total));

  // Binary search for the bracketing segment.
  let lo = 0;
  let hi = track.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid].cumulativeDistanceKm <= d) lo = mid;
    else hi = mid;
  }

  const a = track[lo];
  const b = track[hi];
  const span = b.cumulativeDistanceKm - a.cumulativeDistanceKm;
  const f = span > 0 ? (d - a.cumulativeDistanceKm) / span : 0;

  return {
    lat: a.lat + (b.lat - a.lat) * f,
    lng: a.lng + (b.lng - a.lng) * f,
    bearing: a.bearing,
  };
}

/**
 * Build the 1800-tick speed profile (km/h) per §3.2.1:
 *  - 0-10min: acceleration ramp 0 -> cruise
 *  - 10-45min: cruise with seeded ±5km/h low-frequency walk
 *  - 45-55min: traffic slow-down to 20-35km/h for 4-6min
 *  - 55-60min: resume cruise
 *  - TRK-005: 3-minute full stop at T+28min (fuel stop)
 */
export function buildSpeedProfile(vehicleId: string, cruiseSpeedKmh: number): number[] {
  const rng = seedrandom(`${vehicleId}-speed`);
  const phase1 = rng() * Math.PI * 2;
  const phase2 = rng() * Math.PI * 2;

  const ACCEL_END = 300; // 10 min
  const CRUISE1_END = 1350; // 45 min
  const SLOWDOWN_END = 1650; // 55 min

  const slowdownSpeed = 20 + rng() * 15; // 20-35 km/h
  const slowdownDurationTicks = Math.round((4 + rng() * 2) * 30); // 4-6 min in ticks
  const slowdownStart = CRUISE1_END + Math.round(rng() * (SLOWDOWN_END - CRUISE1_END - slowdownDurationTicks));
  const slowdownEndTick = slowdownStart + slowdownDurationTicks;
  const rampTicks = 30; // 1 min ramps

  const cruiseWalk = (t: number) =>
    3 * Math.sin(t * 0.013 + phase1) + 2 * Math.sin(t * 0.027 + phase2);

  const speeds: number[] = [];
  for (let t = 0; t < TOTAL_TICKS; t++) {
    let speed: number;

    if (t < ACCEL_END) {
      // Smooth acceleration ramp 0 -> cruise
      const f = t / ACCEL_END;
      speed = cruiseSpeedKmh * f + cruiseWalk(t) * f;
    } else if (t < slowdownStart - rampTicks) {
      speed = cruiseSpeedKmh + cruiseWalk(t);
    } else if (t < slowdownStart) {
      const f = (t - (slowdownStart - rampTicks)) / rampTicks;
      const base = cruiseSpeedKmh + cruiseWalk(t);
      speed = base + (slowdownSpeed - base) * f;
    } else if (t < slowdownEndTick) {
      speed = slowdownSpeed + Math.sin(t * 0.05) * 2;
    } else if (t < slowdownEndTick + rampTicks) {
      const f = (t - slowdownEndTick) / rampTicks;
      const target = cruiseSpeedKmh + cruiseWalk(t);
      speed = slowdownSpeed + (target - slowdownSpeed) * f;
    } else {
      speed = cruiseSpeedKmh + cruiseWalk(t);
    }

    speeds.push(Math.max(0, speed));
  }

  if (vehicleId === "TRK-005") {
    // 3-minute full stop at T+28:00 (tick 840), with 30-tick ramps either side.
    const stopStart = 840;
    const stopDuration = 90; // 3 min
    const stopEnd = stopStart + stopDuration;
    const ramp = 30;

    for (let t = stopStart - ramp; t < stopEnd + ramp; t++) {
      if (t < 0 || t >= TOTAL_TICKS) continue;
      if (t < stopStart) {
        const f = (t - (stopStart - ramp)) / ramp;
        speeds[t] = speeds[t] * (1 - f);
      } else if (t < stopEnd) {
        speeds[t] = 0;
      } else {
        const f = (t - stopEnd) / ramp;
        speeds[t] = speeds[t] * f;
      }
    }
  }

  return speeds;
}

/** Integrate the speed profile (km/h) into cumulative distance traveled (km) per tick. */
export function buildDistanceSequence(speedProfile: number[]): number[] {
  const distances: number[] = [];
  let cumulative = 0;
  const hoursPerTick = TICK_SECONDS / 3600;
  for (const speed of speedProfile) {
    cumulative += speed * hoursPerTick;
    distances.push(cumulative);
  }
  return distances;
}
