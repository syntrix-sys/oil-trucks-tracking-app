"use client";

import { useEffect, useState } from "react";
import { reverseGeocode } from "./geocoding";

// Returns a human-readable place name for the given coords.
// Re-resolves only when lat/lng change (rounded to 2dp, ~1km grid).
export function useReverseGeocode(lat: number | undefined, lng: number | undefined): string {
  const [label, setLabel] = useState<string>("");

  const roundedLat = lat !== undefined ? parseFloat(lat.toFixed(2)) : undefined;
  const roundedLng = lng !== undefined ? parseFloat(lng.toFixed(2)) : undefined;

  useEffect(() => {
    if (roundedLat === undefined || roundedLng === undefined) return;
    let cancelled = false;
    setLabel("Locating…");
    reverseGeocode(roundedLat, roundedLng).then((place) => {
      if (!cancelled) setLabel(place);
    });
    return () => { cancelled = true; };
  }, [roundedLat, roundedLng]);

  return label;
}
