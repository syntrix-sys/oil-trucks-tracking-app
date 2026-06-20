import Link from "next/link";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { speedWeightRatio, ratioBand } from "@oiltrack/types";
import { RATIO_BAND_COLORS, formatNumber, statusLabel } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { useReverseGeocode } from "@/lib/useReverseGeocode";

interface VehiclePopupCardProps {
  vehicle: Vehicle;
  frame: TelemetryFrame;
}

const STATUS_COLOR: Record<string, string> = {
  moving:  "bg-primary/15 text-primary",
  idle:    "bg-amber-100 text-amber-700",
  stopped: "bg-gray-100 text-gray-600",
  alert:   "bg-red-100 text-red-600",
};

export default function VehiclePopupCard({ vehicle, frame }: VehiclePopupCardProps) {
  const status   = deriveVehicleStatus(frame);
  const ratio    = speedWeightRatio(frame.speed.current, frame.weight.gross);
  const band     = ratioBand(ratio);
  const placeName = useReverseGeocode(frame.location.lat, frame.location.lng);

  return (
    <div className="text-sm min-w-[230px]">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-bold text-foreground text-base">{vehicle.id}</span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? STATUS_COLOR.stopped}`}>
          {statusLabel(status)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{vehicle.driver.name} · {vehicle.route.name}</p>
      <p className="text-xs text-primary mb-2.5 truncate flex items-center gap-1" title={placeName}>
        <span>📍</span> {placeName || "Locating…"}
      </p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
        <span className="text-muted-foreground">Speed</span>
        <span className="text-right font-semibold text-foreground">{formatNumber(frame.speed.current, 0)} km/h</span>

        <span className="text-muted-foreground">Gross Weight</span>
        <span className="text-right font-semibold text-foreground">{formatNumber(frame.weight.gross, 0)} kg</span>

        <span className="text-muted-foreground">Container Temp</span>
        <span className="text-right font-semibold text-foreground">{formatNumber(frame.temperature.containerCelsius, 1)} °C</span>

        <span className="text-muted-foreground">Fuel</span>
        <span className="text-right font-semibold text-foreground">{formatNumber(frame.engine.fuelLevelPercent, 0)}%</span>

        <span className="text-muted-foreground">S/W Ratio</span>
        <span className="text-right font-semibold" style={{ color: RATIO_BAND_COLORS[band] }}>
          {formatNumber(ratio, 2)}
        </span>
      </div>

      <Link
        href={`/vehicles/${vehicle.id}`}
        className="mt-3 inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline"
      >
        View details →
      </Link>
    </div>
  );
}
