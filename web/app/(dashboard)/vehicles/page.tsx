"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { useTelemetry } from "@/lib/useTelemetry";
import { speedWeightRatio, ratioBand } from "@oiltrack/types";
import { formatNumber, formatDate, RATIO_BAND_COLORS } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "id" | "registration" | "driver" | "cnic" | "speed" | "gross" | "temp" | "fuel" | "ratio" | "status" | "tripStart" | "tripEnd";
type SpeedUnit  = "kmh" | "mph";
type WeightUnit = "kg"  | "litres" | "gallons";

const STATUS_BADGE = {
  moving:  { label: "Moving",  variant: "success"     as const },
  idle:    { label: "Idle",    variant: "warning"     as const },
  stopped: { label: "Stopped", variant: "secondary"   as const },
  alert:   { label: "Alert",   variant: "destructive" as const },
};

const SPEED_LABEL:  Record<SpeedUnit,  string> = { kmh: "km/h", mph: "mph" };
const WEIGHT_LABEL: Record<WeightUnit, string> = { kg: "kg", litres: "L", gallons: "gal" };

const OIL_DENSITY_KG_PER_L = 0.85;
const L_PER_GAL = 3.78541;

function nextSpeed(u: SpeedUnit):  SpeedUnit  { return u === "kmh" ? "mph" : "kmh"; }
function nextWeight(u: WeightUnit): WeightUnit { return u === "kg" ? "litres" : u === "litres" ? "gallons" : "kg"; }

function convertSpeed(kmh: number, unit: SpeedUnit): string {
  const val = unit === "kmh" ? kmh : kmh * 0.621371;
  return `${formatNumber(val, 0)} ${SPEED_LABEL[unit]}`;
}
function convertWeight(kg: number, unit: WeightUnit): string {
  if (unit === "kg")      return `${formatNumber(kg, 0)} kg`;
  const litres = kg / OIL_DENSITY_KG_PER_L;
  if (unit === "litres")  return `${formatNumber(litres, 0)} L`;
  return `${formatNumber(litres / L_PER_GAL, 0)} gal`;
}

/** Small pill button used in cells to cycle the unit for that row. */
function UnitPill({ label, onClick }: { label: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title="Click to change unit"
      className={cn(
        "text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors cursor-pointer select-none",
        "bg-muted text-muted-foreground hover:bg-primary/15 hover:text-primary"
      )}
    >
      {label}
    </button>
  );
}

export default function VehiclesPage() {
  const { vehicles, latestFrames } = useTelemetry();
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortAsc, setSortAsc] = useState(true);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ── Global unit defaults (header toggle resets all rows) ──────────────
  const [globalSpeed,  setGlobalSpeed]  = useState<SpeedUnit>("kmh");
  const [globalWeight, setGlobalWeight] = useState<WeightUnit>("kg");

  // ── Per-row overrides (individual row toggle) ─────────────────────────
  const [speedOv,  setSpeedOv]  = useState<Record<string, SpeedUnit>>({});
  const [weightOv, setWeightOv] = useState<Record<string, WeightUnit>>({});

  const rowSpeed  = (id: string): SpeedUnit  => speedOv[id]  ?? globalSpeed;
  const rowWeight = (id: string): WeightUnit => weightOv[id] ?? globalWeight;

  function cycleRowSpeed(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSpeedOv(p => ({ ...p, [id]: nextSpeed(rowSpeed(id)) }));
  }
  function cycleRowWeight(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setWeightOv(p => ({ ...p, [id]: nextWeight(rowWeight(id)) }));
  }
  function cycleGlobalSpeed(e: React.MouseEvent) {
    e.stopPropagation();
    const next = nextSpeed(globalSpeed);
    setGlobalSpeed(next);
    setSpeedOv({});  // reset per-row overrides
  }
  function cycleGlobalWeight(e: React.MouseEvent) {
    e.stopPropagation();
    const next = nextWeight(globalWeight);
    setGlobalWeight(next);
    setWeightOv({});
  }

  // ── Rows ──────────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (!mounted) return [];
    const list = Object.values(vehicles).map((vehicle) => {
      const frame = latestFrames[vehicle.id] ?? null;
      const ratio = frame ? speedWeightRatio(frame.speed.current, frame.weight.gross) : null;
      return {
        vehicle, frame, ratio,
        band:   ratio !== null ? ratioBand(ratio) : ("normal" as const),
        status: frame ? deriveVehicleStatus(frame) : ("stopped" as const),
        online: !!frame,
      };
    });

    list.sort((a, b) => {
      if (a.online !== b.online) return a.online ? -1 : 1;
      let cmp = 0;
      if (sortKey === "id")           cmp = a.vehicle.id.localeCompare(b.vehicle.id);
      if (sortKey === "registration") cmp = a.vehicle.registrationNumber.localeCompare(b.vehicle.registrationNumber);
      if (sortKey === "driver")       cmp = a.vehicle.driver.name.localeCompare(b.vehicle.driver.name);
      if (sortKey === "cnic")         cmp = (a.vehicle.driver.cnicNumber ?? "").localeCompare(b.vehicle.driver.cnicNumber ?? "");
      if (sortKey === "speed")        cmp = (a.frame?.speed.current ?? -1) - (b.frame?.speed.current ?? -1);
      if (sortKey === "gross")        cmp = (a.frame?.weight.gross ?? -1) - (b.frame?.weight.gross ?? -1);
      if (sortKey === "temp")         cmp = (a.frame?.temperature.containerCelsius ?? -1) - (b.frame?.temperature.containerCelsius ?? -1);
      if (sortKey === "fuel")         cmp = (a.frame?.engine.fuelLevelPercent ?? -1) - (b.frame?.engine.fuelLevelPercent ?? -1);
      if (sortKey === "ratio")        cmp = (a.ratio ?? -1) - (b.ratio ?? -1);
      if (sortKey === "status")       cmp = a.status.localeCompare(b.status);
      if (sortKey === "tripStart")    cmp = (a.vehicle.tripStartDate ?? "").localeCompare(b.vehicle.tripStartDate ?? "");
      if (sortKey === "tripEnd")      cmp = (a.vehicle.tripEndDate ?? "").localeCompare(b.vehicle.tripEndDate ?? "");
      return sortAsc ? cmp : -cmp;
    });

    return list;
  }, [mounted, vehicles, latestFrames, sortKey, sortAsc]);

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
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} vehicles in fleet &middot; {rows.filter((r) => r.online).length} online
          </p>
        </div>
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/vehicles/add">
            <Plus className="h-4 w-4" />
            Add Vehicle
          </Link>
        </Button>
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
                        {/* Speed header — sort label + global unit toggle */}
                        {col.key === "speed" ? (
                          <span className="inline-flex items-center gap-1 justify-end w-full">
                            {col.label}
                            {sortKey === col.key && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            <button
                              onClick={cycleGlobalSpeed}
                              title="Click to change all rows"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/25 transition-colors"
                            >
                              {SPEED_LABEL[globalSpeed]}
                            </button>
                          </span>
                        ) : col.key === "gross" ? (
                          <span className="inline-flex items-center gap-1 justify-end w-full">
                            {col.label}
                            {sortKey === col.key && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                            <button
                              onClick={cycleGlobalWeight}
                              title="Click to change all rows"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/25 transition-colors"
                            >
                              {WEIGHT_LABEL[globalWeight]}
                            </button>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {col.label}
                            {sortKey === col.key && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!mounted ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="px-3 py-2"><Skeleton className="h-3.5 w-16" /></td>
                        <td className="px-3 py-2 hidden sm:table-cell"><Skeleton className="h-3.5 w-24" /></td>
                        <td className="px-3 py-2 hidden md:table-cell"><Skeleton className="h-3.5 w-28" /></td>
                        <td className="px-3 py-2 hidden lg:table-cell"><Skeleton className="h-3.5 w-32" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
                        <td className="px-3 py-2 hidden md:table-cell"><Skeleton className="h-3.5 w-20 ml-auto" /></td>
                        <td className="px-3 py-2 hidden xl:table-cell"><Skeleton className="h-3.5 w-16 ml-auto" /></td>
                        <td className="px-3 py-2 hidden lg:table-cell"><Skeleton className="h-3.5 w-12 ml-auto" /></td>
                        <td className="px-3 py-2 hidden sm:table-cell"><Skeleton className="h-3.5 w-12 ml-auto" /></td>
                        <td className="px-3 py-2 hidden xl:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                        <td className="px-3 py-2 hidden xl:table-cell"><Skeleton className="h-3.5 w-20" /></td>
                        <td className="px-3 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      </tr>
                    ))
                  ) : rows.map(({ vehicle, frame, ratio, band, status, online }) => {
                    const hasAlert = frame?.alerts.some((a) => !a.acknowledged) ?? false;
                    const sb = online
                      ? STATUS_BADGE[hasAlert ? "alert" : status]
                      : { label: "Offline", variant: "secondary" as const };
                    const su = rowSpeed(vehicle.id);
                    const wu = rowWeight(vehicle.id);
                    return (
                      <tr key={vehicle.id} className={cn(
                        "border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors",
                        !online && "opacity-60"
                      )}>
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

                        {/* Speed — per-row unit toggle */}
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground">
                          {frame ? (
                            <span className="inline-flex items-center justify-end gap-1.5">
                              <span className="tabular-nums">
                                {formatNumber(su === "mph" ? frame.speed.current * 0.621371 : frame.speed.current, 0)}
                              </span>
                              <UnitPill label={SPEED_LABEL[su]} onClick={(e) => cycleRowSpeed(vehicle.id, e)} />
                            </span>
                          ) : "—"}
                        </td>

                        {/* Gross Weight — per-row unit toggle */}
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground hidden md:table-cell">
                          {frame ? (
                            <span className="inline-flex items-center justify-end gap-1.5">
                              <span className="tabular-nums">
                                {wu === "kg"
                                  ? formatNumber(frame.weight.gross, 0)
                                  : wu === "litres"
                                  ? formatNumber(frame.weight.gross / OIL_DENSITY_KG_PER_L, 0)
                                  : formatNumber(frame.weight.gross / OIL_DENSITY_KG_PER_L / L_PER_GAL, 0)}
                              </span>
                              <UnitPill label={WEIGHT_LABEL[wu]} onClick={(e) => cycleRowWeight(vehicle.id, e)} />
                            </span>
                          ) : "—"}
                        </td>

                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground hidden xl:table-cell">
                          {frame ? `${formatNumber(frame.temperature.containerCelsius, 1)} °C` : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-foreground hidden lg:table-cell">
                          {frame ? `${formatNumber(frame.engine.fuelLevelPercent, 0)}%` : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-right font-semibold tabular-nums hidden sm:table-cell"
                          style={{ color: ratio !== null ? RATIO_BAND_COLORS[band] : undefined }}>
                          {ratio !== null ? formatNumber(ratio, 2) : "—"}
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
