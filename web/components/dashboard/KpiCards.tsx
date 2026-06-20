import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { Truck, Gauge, AlertTriangle, Navigation, Droplets } from "lucide-react";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { formatNumber } from "@/lib/formatters";

interface KpiCardsProps {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
  cargoLitresOverrides?: Record<string, number>;
}

const CARDS = [
  {
    key: "total",
    icon: Truck,
    clayClass: "clay-green",
    iconStyle: {
      background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)",
      border: "2px solid #1b6438",
      boxShadow: "0 2px 0 #1b6438",
    },
    valueColor: "text-primary",
  },
  {
    key: "moving",
    icon: Navigation,
    clayClass: "clay-emerald",
    iconStyle: {
      background: "linear-gradient(160deg, #34d399 0%, #10b981 100%)",
      border: "2px solid #059669",
      boxShadow: "0 2px 0 #059669",
    },
    valueColor: "text-emerald-700",
  },
  {
    key: "alerts",
    icon: AlertTriangle,
    clayClass: "clay-red",
    iconStyle: {
      background: "linear-gradient(160deg, #f87171 0%, #ef4444 100%)",
      border: "2px solid #b91c1c",
      boxShadow: "0 2px 0 #b91c1c",
    },
    valueColor: "text-red-600",
  },
  {
    key: "speed",
    icon: Gauge,
    clayClass: "clay-amber",
    iconStyle: {
      background: "linear-gradient(160deg, #fbbf24 0%, #f59e0b 100%)",
      border: "2px solid #b45309",
      boxShadow: "0 2px 0 #b45309",
    },
    valueColor: "text-amber-700",
  },
  {
    key: "cargo",
    icon: Droplets,
    clayClass: "clay-sky",
    iconStyle: {
      background: "linear-gradient(160deg, #38bdf8 0%, #0ea5e9 100%)",
      border: "2px solid #0369a1",
      boxShadow: "0 2px 0 #0369a1",
    },
    valueColor: "text-sky-700",
  },
] as const;

const LABELS = ["Total Fleet", "In Motion", "Alerts", "Avg Speed", "Total Cargo"];

export default function KpiCards({ vehicles, telemetry, cargoLitresOverrides = {} }: KpiCardsProps) {
  const frames      = Object.values(telemetry);
  const total       = Object.keys(vehicles).length;
  const moving      = frames.filter((f) => deriveVehicleStatus(f) === "moving").length;
  const alertCount  = frames.reduce((s, f) => s + f.alerts.filter((a) => !a.acknowledged).length, 0);
  const avgSpeed    = frames.length ? frames.reduce((s, f) => s + f.speed.current, 0) / frames.length : 0;
  const totalCargoL = Object.values(cargoLitresOverrides).reduce((s, l) => s + l, 0);

  const data = [
    { value: total.toString(),                    sub: `${moving} active` },
    { value: moving.toString(),                   sub: `${total - moving} idle` },
    { value: alertCount.toString(),               sub: alertCount === 0 ? "All clear" : "Attention" },
    { value: `${formatNumber(avgSpeed, 0)} km/h`, sub: "Fleet avg" },
    { value: `${formatNumber(totalCargoL, 0)} L`, sub: `${Object.keys(cargoLitresOverrides).length} synced` },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-2.5">
      {data.map(({ value, sub }, i) => {
        const { icon: Icon, clayClass, iconStyle, valueColor } = CARDS[i];
        return (
          <div key={LABELS[i]} className={`relative rounded-2xl px-3.5 py-3 overflow-hidden ${clayClass}`}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={iconStyle}>
              <Icon className="h-3.5 w-3.5 text-white" />
            </div>
            <p className={`text-xl font-black tabular-nums leading-none ${valueColor}`}>{value}</p>
            <p className="text-[11px] font-bold text-foreground/70 mt-1 leading-tight">{LABELS[i]}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        );
      })}
    </div>
  );
}
