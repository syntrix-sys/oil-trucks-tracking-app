import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { Truck, Phone, BadgeCheck, MapPin, Clock } from "lucide-react";
import { formatDateTime, formatNumber } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
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

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <Truck className="w-7 h-7 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-foreground">{vehicle.id}</h2>
              <Badge variant={sb.variant}>{sb.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{vehicle.registrationNumber}</p>
            <p className="text-xs text-muted-foreground/60">
              {vehicle.make} {vehicle.model} · {vehicle.year}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Odometer",     value: `${formatNumber(frame.engine.odometerKm, 0)} km` },
            { label: "Running Hrs",  value: `${formatNumber(frame.engine.runningHours, 1)} hrs` },
            { label: "Tank Cap.",    value: `${formatNumber(vehicle.tankCapacityLitres, 0)} L` },
            { label: "Max GVW",      value: `${formatNumber(vehicle.maxGrossWeightKg, 0)} kg` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-secondary/50 rounded-lg p-2.5">
              <p className="text-muted-foreground">{label}</p>
              <p className="text-foreground font-medium mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Driver</p>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/20 text-primary text-sm font-bold">
                {vehicle.driver.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-foreground">{vehicle.driver.name}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <BadgeCheck className="h-3 w-3" /> {vehicle.driver.licenseNumber}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Phone className="h-3 w-3" /> {vehicle.driver.phone}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="h-3 w-3" /> On duty since {formatDateTime(vehicle.driver.onDutySince)}
          </p>
        </div>

        <Separator />

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Route</p>
          <p className="text-sm text-foreground flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary shrink-0" /> {vehicle.route.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {vehicle.route.origin} → {vehicle.route.destination}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
            <Clock className="h-3 w-3" /> ETA {formatDateTime(vehicle.route.estimatedArrival)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
