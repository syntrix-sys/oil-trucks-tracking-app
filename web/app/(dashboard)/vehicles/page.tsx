"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Truck } from "lucide-react";
import { useTelemetry } from "@/lib/useTelemetry";
import { speedWeightRatio, ratioBand } from "@oiltrack/types";
import { formatNumber, formatDate, RATIO_BAND_COLORS } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type SortKey = "id" | "registration" | "driver" | "cnic" | "speed" | "gross" | "temp" | "fuel" | "ratio" | "status" | "tripStart" | "tripEnd";

const STATUS_BADGE = {
  moving:  { label: "Moving",  variant: "success"     as const },
  idle:    { label: "Idle",    variant: "warning"     as const },
  stopped: { label: "Stopped", variant: "secondary"   as const },
  alert:   { label: "Alert",   variant: "destructive" as const },
};

export default function VehiclesPage() {
  const { vehicles, latestFrames } = useTelemetry();
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);

  const rows = useMemo(() => {
    const list = Object.values(vehicles)
      .filter((v) => latestFrames[v.id])
      .map((vehicle) => {
        const frame = latestFrames[vehicle.id];
        const ratio = speedWeightRatio(frame.speed.current, frame.weight.gross);
        return { vehicle, frame, ratio, band: ratioBand(ratio), status: deriveVehicleStatus(frame) };
      });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "id")           cmp = a.vehicle.id.localeCompare(b.vehicle.id);
      if (sortKey === "registration") cmp = a.vehicle.registrationNumber.localeCompare(b.vehicle.registrationNumber);
      if (sortKey === "driver")       cmp = a.vehicle.driver.name.localeCompare(b.vehicle.driver.name);
      if (sortKey === "cnic")         cmp = (a.vehicle.driver.cnicNumber ?? "").localeCompare(b.vehicle.driver.cnicNumber ?? "");
      if (sortKey === "speed")        cmp = a.frame.speed.current - b.frame.speed.current;
      if (sortKey === "gross")        cmp = a.frame.weight.gross - b.frame.weight.gross;
      if (sortKey === "temp")         cmp = a.frame.temperature.containerCelsius - b.frame.temperature.containerCelsius;
      if (sortKey === "fuel")         cmp = a.frame.engine.fuelLevelPercent - b.frame.engine.fuelLevelPercent;
      if (sortKey === "ratio")        cmp = a.ratio - b.ratio;
      if (sortKey === "status")       cmp = a.status.localeCompare(b.status);
      if (sortKey === "tripStart")    cmp = (a.vehicle.tripStartDate ?? "").localeCompare(b.vehicle.tripStartDate ?? "");
      if (sortKey === "tripEnd")      cmp = (a.vehicle.tripEndDate ?? "").localeCompare(b.vehicle.tripEndDate ?? "");
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [vehicles, latestFrames, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  const columns: { key: SortKey; label: string; align?: "right"; hidden?: string }[] = [
    { key: "id",           label: "Vehicle ID" },
    { key: "registration", label: "Reg. Number",   hidden: "hidden sm:table-cell" },
    { key: "driver",       label: "Driver",         hidden: "hidden md:table-cell" },
    { key: "cnic",         label: "CNIC",           hidden: "hidden lg:table-cell" },
    { key: "speed",        label: "Speed",          align: "right" },
    { key: "gross",        label: "Gross Wt",       align: "right", hidden: "hidden md:table-cell" },
    { key: "temp",         label: "Container Temp", align: "right", hidden: "hidden xl:table-cell" },
    { key: "fuel",         label: "Fuel",           align: "right", hidden: "hidden lg:table-cell" },
    { key: "ratio",        label: "Ratio",          align: "right", hidden: "hidden sm:table-cell" },
    { key: "tripStart",    label: "Trip Start",     hidden: "hidden xl:table-cell" },
    { key: "tripEnd",      label: "Trip End",       hidden: "hidden xl:table-cell" },
    { key: "status",       label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Vehicles</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} vehicles in fleet</p>
        </div>
        <Truck className="h-5 w-5 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fleet Table</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="rounded-b-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "px-3 py-2 font-medium cursor-pointer select-none hover:text-foreground transition-colors text-[11px] uppercase tracking-wide",
                          col.align === "right" ? "text-right" : "text-left",
                          col.hidden
                        )}
                      >
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ vehicle, frame, ratio, band, status }) => {
                    const hasAlert = frame.alerts.some((a) => !a.acknowledged);
                    const sb = STATUS_BADGE[hasAlert ? "alert" : status];
                    return (
                      <tr key={vehicle.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                        <td className="px-3 py-2 text-xs">
                          <Link href={`/vehicles/${vehicle.id}`} className="font-semibold text-primary hover:underline">
                            {vehicle.id}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-xs text-foreground/80 hidden sm:table-cell font-mono">
                          {vehicle.registrationNumber}
                        </td>
                        <td className="px-3 py-2 text-xs text-foreground/80 hidden md:table-cell">
                          {vehicle.driver.name}
                        </td>
                        <td className="px-3 py-2 text-xs text-foreground/60 hidden lg:table-cell font-mono">
                          {vehicle.driver.cnicNumber ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground">{formatNumber(frame.speed.current, 0)} km/h</td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground hidden md:table-cell">{formatNumber(frame.weight.gross, 0)} kg</td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground hidden xl:table-cell">{formatNumber(frame.temperature.containerCelsius, 1)} °C</td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground hidden lg:table-cell">{formatNumber(frame.engine.fuelLevelPercent, 0)}%</td>
                        <td className="px-3 py-2 text-xs text-right font-semibold tabular-nums hidden sm:table-cell" style={{ color: RATIO_BAND_COLORS[band] }}>
                          {formatNumber(ratio, 2)}
                        </td>
                        <td className="px-3 py-2 text-xs text-foreground/60 hidden xl:table-cell whitespace-nowrap">
                          {formatDate(vehicle.tripStartDate)}
                        </td>
                        <td className="px-3 py-2 text-xs text-foreground/60 hidden xl:table-cell whitespace-nowrap">
                          {formatDate(vehicle.tripEndDate)}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={sb.variant}>{sb.label}</Badge>
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
    </div>
  );
}
