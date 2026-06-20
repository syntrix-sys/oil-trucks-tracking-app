"use client";

import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { Truck, Phone, BadgeCheck, MapPin, Clock, CreditCard, Gauge } from "lucide-react";
import { formatDateTime, formatDate, formatNumber } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { useReverseGeocode } from "@/lib/useReverseGeocode";
import { useTelemetryStore } from "@/store/telemetryStore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const STATUS_BADGE = {
  moving:  { label: "Moving",  variant: "success"     as const },
  idle:    { label: "Idle",    variant: "warning"     as const },
  stopped: { label: "Stopped", variant: "secondary"   as const },
  alert:   { label: "Alert",   variant: "destructive" as const },
};

interface VehicleSummaryCardProps {
  vehicle: Vehicle;
  frame: TelemetryFrame;
}

export default function VehicleSummaryCard({ vehicle, frame }: VehicleSummaryCardProps) {
  const status = deriveVehicleStatus(frame);
  const sb = STATUS_BADGE[status] ?? STATUS_BADGE.stopped;
  const cargoLitresOverrides = useTelemetryStore((s) => s.cargoLitresOverrides);
  const placeName = useReverseGeocode(frame.location.lat, frame.location.lng);

  // Prefer mobile override, then frame value, then derive from percentFull
  const cargoLitres =
    cargoLitresOverrides[vehicle.id] ??
    frame.weight.cargoLitres ??
    Math.round((frame.weight.percentFull / 100) * vehicle.tankCapacityLitres);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl clay flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">{vehicle.id}</h2>
              <Badge variant={sb.variant}>{sb.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{vehicle.registrationNumber}</p>
            <p className="text-xs text-muted-foreground/60">
              {vehicle.make} {vehicle.model} · {vehicle.year}
            </p>
          </div>
        </div>

        {/* Vehicle specs */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Odometer",      value: `${formatNumber(frame.engine.odometerKm, 0)} km` },
            { label: "Running Hrs",   value: `${formatNumber(frame.engine.runningHours, 1)} hrs` },
            { label: "Tank Cap.",     value: `${formatNumber(vehicle.tankCapacityLitres, 0)} L` },
            { label: "Max GVW",       value: `${formatNumber(vehicle.maxGrossWeightKg, 0)} kg` },
            { label: "Chassis No.",   value: vehicle.chassisNumber ?? "—" },
            { label: "Wheels",        value: vehicle.numberOfWheels ? `${vehicle.numberOfWheels}` : "—" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-background clay rounded-xl p-2.5">
              <p className="text-muted-foreground">{label}</p>
              <p className="text-foreground font-medium mt-0.5 font-mono truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* Live cargo liters — synced from mobile */}
        <div className="flex items-center gap-3 bg-background clay rounded-xl p-3">
          <Gauge className="h-5 w-5 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Cargo (Live Liters)</p>
            <p className="text-lg font-bold text-primary tabular-nums">
              {formatNumber(cargoLitres, 0)} L
              <span className="text-xs font-normal text-muted-foreground ml-1.5">
                ({formatNumber(frame.weight.percentFull, 0)}% full)
              </span>
            </p>
          </div>
          {cargoLitresOverrides[vehicle.id] !== undefined && (
            <Badge variant="info" className="ml-auto text-[9px]">Mobile</Badge>
          )}
        </div>

        {/* Trip dates */}
        {(vehicle.tripStartDate || vehicle.tripEndDate) && (
          <>
            <Separator />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Trip Schedule</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-background clay rounded-xl p-2.5">
                  <p className="text-muted-foreground">Trip Start</p>
                  <p className="text-foreground font-medium mt-0.5">{formatDate(vehicle.tripStartDate)}</p>
                </div>
                <div className="bg-background clay rounded-xl p-2.5">
                  <p className="text-muted-foreground">Trip End</p>
                  <p className="text-foreground font-medium mt-0.5">{formatDate(vehicle.tripEndDate)}</p>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Driver */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Driver</p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-background clay text-primary text-sm font-bold">
                {vehicle.driver.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{vehicle.driver.name}</p>
              {vehicle.driver.fatherName && (
                <p className="text-xs text-muted-foreground/70">S/O {vehicle.driver.fatherName}</p>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BadgeCheck className="h-3 w-3 shrink-0" /> {vehicle.driver.licenseNumber}
              </p>
            </div>
          </div>

          {vehicle.driver.cnicNumber && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3 shrink-0" />
              <span className="font-mono">{vehicle.driver.cnicNumber}</span>
            </div>
          )}

          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1.5">
            <Phone className="h-3 w-3 shrink-0" /> {vehicle.driver.phone}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3 shrink-0" /> On duty since {formatDateTime(vehicle.driver.onDutySince)}
          </p>
          {vehicle.driver.permanentAddress && (
            <p className="text-xs text-muted-foreground/70 mt-1 leading-relaxed">
              {vehicle.driver.permanentAddress}
            </p>
          )}
        </div>

        <Separator />

        {/* Route */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Route</p>
          <p className="text-sm text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> {vehicle.route.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {vehicle.route.origin} → {vehicle.route.destination}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Clock className="h-3 w-3 shrink-0" /> ETA {formatDateTime(vehicle.route.estimatedArrival)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs bg-background clay rounded-xl px-2.5 py-1.5">
            <MapPin className="h-3 w-3 text-primary shrink-0" />
            <span className="text-primary truncate">{placeName || "Locating…"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
