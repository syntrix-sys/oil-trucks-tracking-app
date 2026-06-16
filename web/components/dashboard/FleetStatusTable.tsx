"use client";

import Link from "next/link";
import type { TelemetryFrame, Vehicle, AlertSeverity } from "@oiltrack/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatNumber } from "@/lib/formatters";
import { deriveVehicleStatus, highestSeverity } from "@/lib/vehicleStatus";
import { cn } from "@/lib/utils";

const SEVERITY_RANK: Record<"none" | AlertSeverity, number> = { critical: 3, warning: 2, info: 1, none: 0 };

const STATUS_BADGE: Record<string, { label: string; variant: "destructive" | "warning" | "success" | "secondary" }> = {
  alert:   { label: "Alert",   variant: "destructive" },
  moving:  { label: "Moving",  variant: "success" },
  idle:    { label: "Idle",    variant: "warning" },
  stopped: { label: "Stopped", variant: "secondary" },
};

const SEV_BADGE: Record<string, { label: string; variant: "destructive" | "warning" | "info" | "secondary" }> = {
  critical: { label: "Critical", variant: "destructive" },
  warning:  { label: "Warning",  variant: "warning" },
  info:     { label: "Info",     variant: "info" },
};

interface FleetStatusTableProps {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
  limit?: number;
}

export default function FleetStatusTable({ vehicles, telemetry, limit }: FleetStatusTableProps) {
  const rows = Object.values(vehicles)
    .map((v) => ({ vehicle: v, frame: telemetry[v.id] }))
    .filter((r) => r.frame)
    .sort((a, b) => SEVERITY_RANK[highestSeverity(b.frame)] - SEVERITY_RANK[highestSeverity(a.frame)]);

  const visible = limit ? rows.slice(0, limit) : rows;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Fleet Status {limit ? `(Top ${limit})` : ""}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="rounded-b-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] text-muted-foreground uppercase tracking-wide">
                  <th className="px-3 py-2 text-left font-medium">Vehicle</th>
                  <th className="px-3 py-2 text-left font-medium hidden sm:table-cell">Driver</th>
                  <th className="px-3 py-2 text-right font-medium">Speed</th>
                  <th className="px-3 py-2 text-right font-medium hidden md:table-cell">Gross Wt</th>
                  <th className="px-3 py-2 text-right font-medium hidden lg:table-cell">Temp</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ vehicle, frame }) => {
                  const status = deriveVehicleStatus(frame);
                  const sev = highestSeverity(frame);
                  const statusB = STATUS_BADGE[sev !== "none" ? "alert" : status];
                  const sevB = SEV_BADGE[sev];

                  return (
                    <tr key={vehicle.id} className={cn("border-b border-border/40 last:border-0 hover:bg-secondary/40 transition-colors text-xs", sev === "critical" && "bg-destructive/5")}>
                      <td className="px-3 py-2">
                        <Link href={`/vehicles/${vehicle.id}`} className="font-semibold text-primary hover:underline">
                          {vehicle.id}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{vehicle.driver.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground">{formatNumber(frame.speed.current, 0)} km/h</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground hidden md:table-cell">{formatNumber(frame.weight.gross, 0)} kg</td>
                      <td className="px-3 py-2 text-right tabular-nums text-foreground hidden lg:table-cell">{formatNumber(frame.temperature.containerCelsius, 1)} °C</td>
                      <td className="px-3 py-2">
                        {sevB ? (
                          <Badge variant={sevB.variant}>{sevB.label}</Badge>
                        ) : (
                          <Badge variant={statusB.variant}>{statusB.label}</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
