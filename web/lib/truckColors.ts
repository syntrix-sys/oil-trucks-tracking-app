/** Fixed per-truck colors for visual differentiation on the map and sidebar. */
export const TRUCK_COLORS: Record<string, string> = {
  "TRK-001": "#3B82F6", // blue
  "TRK-002": "#F97316", // orange
  "TRK-003": "#A855F7", // purple
  "TRK-004": "#06B6D4", // cyan
  "TRK-005": "#EC4899", // pink
  "TRK-006": "#EAB308", // yellow
  "TRK-007": "#14B8A6", // teal
  "TRK-008": "#F43F5E", // rose
};

const FALLBACK_PALETTE = [
  "#3B82F6","#F97316","#A855F7","#06B6D4",
  "#EC4899","#EAB308","#14B8A6","#F43F5E",
  "#84CC16","#8B5CF6","#0EA5E9","#D946EF",
];

/** Returns the color for a truck ID, generating a stable fallback for unknown IDs. */
export function truckColor(vehicleId: string): string {
  if (TRUCK_COLORS[vehicleId]) return TRUCK_COLORS[vehicleId];
  // Stable hash for newly added vehicles
  let hash = 0;
  for (let i = 0; i < vehicleId.length; i++) hash = vehicleId.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}
