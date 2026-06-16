import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { Truck, Gauge, AlertTriangle, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { formatNumber } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface KpiCardsProps {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
}

const CARDS = [
  {
    key: "total",
    icon: Truck,
    accent: "text-primary",
    iconBg: "bg-primary/15",
    borderTop: "border-t-primary/60",
  },
  {
    key: "moving",
    icon: Navigation,
    accent: "text-success",
    iconBg: "bg-success/15",
    borderTop: "border-t-success/60",
  },
  {
    key: "alerts",
    icon: AlertTriangle,
    accent: "text-destructive",
    iconBg: "bg-destructive/15",
    borderTop: "border-t-destructive/60",
  },
  {
    key: "speed",
    icon: Gauge,
    accent: "text-warning",
    iconBg: "bg-warning/15",
    borderTop: "border-t-warning/60",
  },
] as const;

export default function KpiCards({ vehicles, telemetry }: KpiCardsProps) {
  const frames = Object.values(telemetry);
  const total = Object.keys(vehicles).length;
  const moving = frames.filter((f) => deriveVehicleStatus(f) === "moving").length;
  const alertCount = frames.reduce((s, f) => s + f.alerts.filter((a) => !a.acknowledged).length, 0);
  const avgSpeed = frames.length ? frames.reduce((s, f) => s + f.speed.current, 0) / frames.length : 0;

  const data = [
    { label: "Total Vehicles", value: total.toString(),                  sub: `${moving} in motion`,    badge: null as React.ReactNode },
    { label: "Moving",         value: moving.toString(),                 sub: `${total - moving} idle`, badge: moving > 0 ? <Badge variant="success">Active</Badge> : null },
    { label: "Active Alerts",  value: alertCount.toString(),             sub: alertCount === 0 ? "All clear" : "Needs attention", badge: alertCount > 0 ? <Badge variant="destructive">Action</Badge> : <Badge variant="success">Clear</Badge> },
    { label: "Avg Speed",      value: `${formatNumber(avgSpeed, 0)} km/h`, sub: "Fleet average",         badge: null },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
      {data.map(({ label, value, sub, badge }, i) => {
        const { icon: Icon, accent, iconBg, borderTop } = CARDS[i];
        return (
          <div
            key={label}
            className={cn(
              "relative overflow-hidden rounded-lg border bg-card px-4 pt-3 pb-4 border-t-2",
              borderTop
            )}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={cn("p-1.5 rounded-md", iconBg)}>
                <Icon className={cn("h-3.5 w-3.5", accent)} />
              </div>
              {badge}
            </div>
            <p className={cn("text-2xl font-bold tabular-nums", accent)}>{value}</p>
            <p className="text-[11px] font-medium text-foreground/70 mt-0.5">{label}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        );
      })}
    </div>
  );
}
