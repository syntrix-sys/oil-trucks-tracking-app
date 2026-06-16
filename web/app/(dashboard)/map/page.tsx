"use client";

import { useState } from "react";
import { AlertTriangle, Satellite, Map as MapIcon } from "lucide-react";
import { useTelemetry } from "@/lib/useTelemetry";
import FleetMap, { MAP_STYLES } from "@/components/map/FleetMap";
import VehicleListSidebar from "@/components/map/VehicleListSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export default function FleetMapPage() {
  const { vehicles, latestFrames, activeAlerts, lastUpdate } = useTelemetry();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [style, setStyle] = useState<"streets" | "satellite">("streets");

  const criticalCount = activeAlerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;
  const warningCount = activeAlerts.filter((a) => a.severity === "warning" && !a.acknowledged).length;

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] -m-4 md:-m-6 p-4 md:p-6 gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-foreground">Fleet Map</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {criticalCount} Critical
            </Badge>
          )}
          {warningCount > 0 && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {warningCount} Warning
            </Badge>
          )}
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Updated {formatTime(lastUpdate)}
          </span>

          <div className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStyle("streets")}
              className={cn(
                "rounded-none gap-1.5 h-8 px-3 text-xs",
                style === "streets" ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              <MapIcon className="h-3.5 w-3.5" /> Dark
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStyle("satellite")}
              className={cn(
                "rounded-none gap-1.5 h-8 px-3 text-xs",
                style === "satellite" ? "bg-primary/15 text-primary" : "text-muted-foreground"
              )}
            >
              <Satellite className="h-3.5 w-3.5" /> Light
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-3 min-h-0">
        <VehicleListSidebar
          vehicles={vehicles}
          telemetry={latestFrames}
          selectedVehicleId={selectedVehicleId}
          onSelectVehicle={setSelectedVehicleId}
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((c) => !c)}
        />
        <div className="flex-1 rounded-xl overflow-hidden border border-border">
          <FleetMap
            vehicles={vehicles}
            telemetry={latestFrames}
            mapStyle={MAP_STYLES[style]}
            showRoutes
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
          />
        </div>
      </div>
    </div>
  );
}
