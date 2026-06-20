import type { LoadEntry, Vehicle } from "@oiltrack/types";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadLogPanelProps {
  vehicle: Vehicle;
  entries: LoadEntry[];
}

function fillColor(pct: number) {
  if (pct >= 95) return "text-destructive";
  if (pct >= 80) return "text-warning";
  return "text-success";
}

function fillBg(pct: number) {
  if (pct >= 95) return "bg-destructive";
  if (pct >= 80) return "bg-warning";
  return "bg-success";
}

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-PK", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return iso;
  }
}

export default function LoadLogPanel({ vehicle, entries }: LoadLogPanelProps) {
  const capacity = vehicle.tankCapacityLitres;

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 flex flex-col items-center gap-3 text-center">
        <Droplets className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">No load entries yet</p>
        <p className="text-xs text-muted-foreground">
          Load entries appear here once the driver syncs from the mobile app.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b flex items-center gap-2">
        <Droplets className="h-4 w-4 text-sky-400" />
        <span className="text-sm font-semibold text-foreground">Load Log</span>
        <Badge variant="secondary" className="ml-auto text-xs">{entries.length} entries</Badge>
      </div>

      <div className="divide-y divide-border">
        {entries.map((entry) => {
          const pct = capacity > 0 ? Math.min(100, (entry.totalLiters / capacity) * 100) : 0;
          return (
            <div key={entry.id} className="px-4 py-3 flex items-start gap-4">
              {/* Fill bar column */}
              <div className="w-20 shrink-0 pt-1">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", fillBg(pct))}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className={cn("text-[10px] font-bold mt-1 tabular-nums", fillColor(pct))}>
                  {pct.toFixed(1)}%
                </p>
              </div>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-foreground tabular-nums">
                    {Math.round(entry.totalLiters).toLocaleString()} L
                  </span>
                  {entry.syncedFromMobile && (
                    <Badge variant="secondary" className="gap-1 text-[10px] text-sky-400 border-sky-400/30">
                      <Smartphone className="h-2.5 w-2.5" />
                      Mobile
                    </Badge>
                  )}
                </div>
                {entry.note && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{entry.note}</p>
                )}
              </div>

              {/* Timestamp */}
              <p className="text-[10px] text-muted-foreground shrink-0 text-right pt-0.5">
                {formatTs(entry.timestamp)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
