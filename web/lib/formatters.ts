import type { AlertSeverity, VehicleStatus } from "@oiltrack/types";
import type { RatioBand } from "@oiltrack/types";

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "--:--:--";
  return new Date(iso).toLocaleTimeString(undefined, { hour12: false });
}

/** Formats an ISO timestamp as DD/MM/YYYY HH:MM */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh   = String(d.getHours()).padStart(2, "0");
  const min  = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

/** Formats an ISO timestamp as DD/MM/YYYY only */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "--";
  const d = new Date(iso);
  const dd   = String(d.getDate()).padStart(2, "0");
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export const STATUS_COLORS: Record<VehicleStatus, string> = {
  moving: "#22C55E",
  idle: "#F59E0B",
  stopped: "#94A3B8",
  alert: "#EF4444",
};

export const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  info: "#3B82F6",
  warning: "#F59E0B",
  critical: "#EF4444",
};

export const RATIO_BAND_COLORS: Record<RatioBand, string> = {
  normal: "#22C55E",
  caution: "#F59E0B",
  warning: "#F97316",
  critical: "#EF4444",
};

export function statusLabel(status: VehicleStatus): string {
  switch (status) {
    case "moving":  return "Moving";
    case "idle":    return "Idle";
    case "stopped": return "Stopped";
    case "alert":   return "Alert";
  }
}
