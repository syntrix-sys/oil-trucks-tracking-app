"use client";

import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@oiltrack/types";

import { OSRM_BASE } from "@/lib/config";

export type RoadCoords = [number, number][]; // [lng, lat] pairs (GeoJSON order)

/**
 * Sample every Nth waypoint from the vehicle's route to produce a compact list
 * of ~8-10 anchor coordinates suitable for an OSRM request.
 */
function sampleWaypoints(waypoints: { lat: number; lng: number }[]): [number, number][] {
  if (waypoints.length === 0) return [];
  if (waypoints.length <= 10) return waypoints.map((w) => [w.lng, w.lat]);

  const step = Math.floor(waypoints.length / 8);
  const sampled: [number, number][] = [];
  for (let i = 0; i < waypoints.length; i += step) {
    sampled.push([waypoints[i].lng, waypoints[i].lat]);
  }
  // Always include the last point
  const last = waypoints[waypoints.length - 1];
  if (sampled[sampled.length - 1][0] !== last.lng || sampled[sampled.length - 1][1] !== last.lat) {
    sampled.push([last.lng, last.lat]);
  }
  return sampled;
}

async function fetchOsrmRoute(coords: [number, number][]): Promise<RoadCoords | null> {
  const coordStr = coords.map(([lng, lat]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/${coordStr}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const data = await res.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates;
    if (!Array.isArray(geometry) || geometry.length === 0) return null;
    return geometry as RoadCoords;
  } catch {
    return null;
  }
}

/**
 * Fetches road-following routes for all vehicles from OSRM.
 * Results are fetched once on mount and cached.
 * Falls back to null (caller uses straight-line waypoints) on any failure.
 */
export function useRoadRoutes(vehicles: Record<string, Vehicle>): Record<string, RoadCoords | null> {
  const [routes, setRoutes] = useState<Record<string, RoadCoords | null>>({});
  const fetchedRef = useRef(false);

  useEffect(() => {
    const ids = Object.keys(vehicles);
    if (ids.length === 0 || fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchAll() {
      const results: Record<string, RoadCoords | null> = {};

      // Fetch one at a time to be polite to the free OSRM server
      for (const id of ids) {
        const vehicle = vehicles[id];
        const waypoints = vehicle.route?.waypoints;
        if (!waypoints || waypoints.length < 2) {
          results[id] = null;
          continue;
        }
        const sampled = sampleWaypoints(waypoints);
        if (sampled.length < 2) {
          results[id] = null;
          continue;
        }
        // Small delay between requests to avoid rate limiting
        await new Promise((r) => setTimeout(r, 150));
        results[id] = await fetchOsrmRoute(sampled);
      }

      setRoutes(results);
    }

    fetchAll();
  }, [vehicles]);

  return routes;
}
