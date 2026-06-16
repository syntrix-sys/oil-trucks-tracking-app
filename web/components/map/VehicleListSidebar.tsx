"use client";

import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { formatNumber } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
        "relative bg-card border border-border rounded-xl flex flex-col overflow-hidden transition-all duration-200",
        collapsed ? "w-0 border-0" : "w-64"
      )}
    >
      {!collapsed && (
        <>
          <div className="px-4 py-3 border-b border-border shrink-0">
            <h3 className="text-sm font-semibold text-foreground">
              Fleet ({Object.keys(vehicles).length})
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/50">
              {Object.values(vehicles).map((vehicle) => {
                const frame = telemetry[vehicle.id];
                const status = deriveVehicleStatus(frame);
                const active = selectedVehicleId === vehicle.id;
                const sb = STATUS_BADGE[status] ?? STATUS_BADGE.stopped;
                return (
                  <button
                    key={vehicle.id}
                    onClick={() => onSelectVehicle(vehicle.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 transition-colors",
                      active ? "bg-primary/10" : "hover:bg-secondary/40"
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
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </>
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={onToggleCollapsed}
        className="absolute top-3 -right-3 h-6 w-6 rounded-full shadow-md z-10 border-border bg-card"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>
    </div>
  );
}
