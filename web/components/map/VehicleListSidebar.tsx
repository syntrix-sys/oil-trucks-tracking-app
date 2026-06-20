"use client";

import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { formatNumber } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { useReverseGeocode } from "@/lib/useReverseGeocode";
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
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{vehicle.id}</span>
        <Badge variant={sb.variant} className="text-[10px] h-4 px-1.5">{sb.label}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{vehicle.driver.name}</p>
      {frame && (
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatNumber(frame.speed.current, 0)} km/h · {formatNumber(frame.weight.gross, 0)} kg
        </p>
      )}
      {active && placeName && (
        <div className="flex items-center gap-1 mt-1.5">
          <MapPin className="h-2.5 w-2.5 text-primary shrink-0" />
          <p className="text-[10px] text-primary truncate">{placeName}</p>
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
    <div
      className={cn(
        "relative bg-background rounded-2xl flex flex-col overflow-hidden transition-all duration-200 clay",
        collapsed ? "w-0 opacity-0 shadow-none" : "w-64"
      )}
    >
      {!collapsed && (
        <>
          <div className="px-4 py-3 shrink-0" style={{ boxShadow: "0 2px 6px var(--n-dark)" }}>
            <h3 className="text-sm font-semibold text-foreground">
              Fleet ({Object.keys(vehicles).length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
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
          </ScrollArea>
        </>
      )}

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
