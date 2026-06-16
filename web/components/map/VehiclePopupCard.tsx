import Link from "next/link";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { speedWeightRatio, ratioBand } from "@oiltrack/types";
import { RATIO_BAND_COLORS, formatNumber, statusLabel } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";

interface VehiclePopupCardProps {
  vehicle: Vehicle;
  frame: TelemetryFrame;
}

export default function VehiclePopupCard({ vehicle, frame }: VehiclePopupCardProps) {
  const status = deriveVehicleStatus(frame);
  const ratio = speedWeightRatio(frame.speed.current, frame.weight.gross);
  const band = ratioBand(ratio);

  return (
    <div className="text-sm min-w-[220px]">
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-text-primary">{vehicle.id}</span>
        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
          {statusLabel(status)}
        </span>
      </div>
      <p className="text-xs text-slate-400 mb-2">{vehicle.driver.name} • {vehicle.route.name}</p>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <span className="text-slate-400">Speed</span>
        <span className="text-right text-text-primary">{formatNumber(frame.speed.current, 0)} km/h</span>

        <span className="text-slate-400">Gross Weight</span>
        <span className="text-right text-text-primary">{formatNumber(frame.weight.gross, 0)} kg</span>

        <span className="text-slate-400">Container Temp</span>
        <span className="text-right text-text-primary">{formatNumber(frame.temperature.containerCelsius, 1)} °C</span>

        <span className="text-slate-400">Fuel</span>
        <span className="text-right text-text-primary">{formatNumber(frame.engine.fuelLevelPercent, 0)}%</span>

        <span className="text-slate-400">Speed/Weight Ratio</span>
        <span className="text-right font-medium" style={{ color: RATIO_BAND_COLORS[band] }}>
          {formatNumber(ratio, 2)}
        </span>
      </div>

      <Link
        href={`/vehicles/${vehicle.id}`}
        className="mt-2 inline-block text-xs text-accent hover:underline"
      >
        View details →
      </Link>
    </div>
  );
}
