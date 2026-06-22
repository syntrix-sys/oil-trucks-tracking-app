"use client";

import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { formatNumber } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { useReverseGeocode } from "@/lib/useReverseGeocode";
import { truckColor } from "@/lib/truckColors";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_BADGE = {
  moving:  { label: "Moving",  variant: "success"     as const },
  idle:    { label: "Idle",    variant: "warning"     as const },
  stopped: { label: "Stopped", variant: "secondary"   as const },
  alert:   { label: "Alert",   variant: "destructive" as const },
};

interface VehicleListSidebarProps {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

function VehicleRow({
  vehicle,
  frame,
  active,
  onSelect,
}: {
  vehicle: Vehicle;
  frame: TelemetryFrame | undefined;
  active: boolean;
  onSelect: () => void;
}) {
  const status = deriveVehicleStatus(frame);
  const sb = STATUS_BADGE[status] ?? STATUS_BADGE.stopped;
  const color = truckColor(vehicle.id);
  const placeName = useReverseGeocode(
    active ? frame?.location.lat : undefined,
    active ? frame?.location.lng : undefined
  );

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full text-left px-4 py-3 transition-all",
        active ? "clay-nav-active" : "hover:bg-accent/60"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        {/* Truck color swatch — links sidebar row to map route */}
        <span
          className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0 ring-1 ring-black/10"
          style={{ backgroundColor: color }}
        />
        <span className={cn("text-sm font-bold flex-1", active ? "text-white" : "text-foreground")}>
          {vehicle.id}
        </span>
        <Badge
          variant={active ? "outline" : sb.variant}
          className={cn("text-[10px] h-4 px-1.5 flex-shrink-0", active && "border-white/50 text-white bg-white/15")}
        >
          {sb.label}
        </Badge>
      </div>
      <p className={cn("text-xs pl-[18px]", active ? "text-white/80" : "text-muted-foreground")}>
        {vehicle.driver.name}
      </p>
      {frame && (
        <p className={cn("text-xs mt-0.5 pl-[18px]", active ? "text-white/65" : "text-muted-foreground/70")}>
          {formatNumber(frame.speed.current, 0)} km/h · {formatNumber(frame.weight.gross, 0)} kg
        </p>
      )}
      {active && placeName && (
        <div className="flex items-center gap-1 mt-1.5 pl-[18px]">
          <MapPin className="h-2.5 w-2.5 text-white/80 shrink-0" />
          <p className="text-[10px] text-white/80 truncate">{placeName}</p>
        </div>
      )}
    </button>
  );
}

export default function VehicleListSidebar({
  vehicles,
  telemetry,
  selectedVehicleId,
  onSelectVehicle,
  collapsed,
  onToggleCollapsed,
}: VehicleListSidebarProps) {
  return (
    /*
     * Outer wrapper keeps a non-zero width at all times so the toggle button
     * is never hidden. The inner panel shrinks to w-0 + opacity-0 when
     * collapsed; the outer only collapses to w-3 (enough for the protruding
     * button). overflow-visible is the default so -right-3 button isn't clipped.
     */
    <div
      className={cn(
        "relative flex-shrink-0 transition-all duration-200",
        collapsed ? "w-3" : "w-64"
      )}
    >
      {/* Inner panel */}
      <div
        className={cn(
          "h-full rounded-2xl flex flex-col clay transition-all duration-200 overflow-hidden",
          collapsed
            ? "w-0 opacity-0 shadow-none pointer-events-none"
            : "w-64 bg-background opacity-100"
        )}
      >
        {/* Fixed header */}
        <div
          className="px-4 py-3 shrink-0 border-b border-border/30"
          style={{ boxShadow: "0 2px 6px var(--n-dark)" }}
        >
          <h3 className="text-sm font-semibold text-foreground">
            Fleet ({Object.keys(vehicles).length})
          </h3>
        </div>

        {/* Scrollable list — flex-1 + min-h-0 ensures it stays inside the panel */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="divide-y divide-border/30">
            {Object.values(vehicles).map((vehicle) => (
              <VehicleRow
                key={vehicle.id}
                vehicle={vehicle}
                frame={telemetry[vehicle.id]}
                active={selectedVehicleId === vehicle.id}
                onSelect={() => onSelectVehicle(vehicle.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Toggle button — always visible, outside the collapsing panel */}
      <Button
        variant="outline"
        size="icon"
        onClick={onToggleCollapsed}
        className="absolute top-3 -right-3 h-6 w-6 rounded-full z-10 bg-background clay"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </div>
  );
}
