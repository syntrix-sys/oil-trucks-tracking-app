import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { THRESHOLDS, speedThresholds, grossWeightThresholds, speedWeightRatio, ratioBand } from "@oiltrack/types";
import SemiCircleGauge from "./SemiCircleGauge";
import RatioGauge from "./RatioGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TelemetryGaugesProps {
  vehicle: Vehicle;
  frame: TelemetryFrame;
}

function bandColor(value: number, warning: number, critical: number, invert = false): string {
  if (invert) {
    if (value <= critical) return "#EF4444";
    if (value <= warning) return "#F59E0B";
    return "#22C55E";
  }
  if (value >= critical) return "#EF4444";
  if (value >= warning) return "#F59E0B";
  return "#22C55E";
}

export default function TelemetryGauges({ vehicle, frame }: TelemetryGaugesProps) {
  const speedT = speedThresholds(vehicle.maxSpeedKmh);
  const weightT = grossWeightThresholds(vehicle.maxGrossWeightKg);
  const ratio = speedWeightRatio(frame.speed.current, frame.weight.gross);
  const band = ratioBand(ratio);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Live Telemetry</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <SemiCircleGauge
            label="Speed"
            value={frame.speed.current}
            max={vehicle.maxSpeedKmh}
            unit="km/h"
            color={bandColor(frame.speed.current, speedT.warning, speedT.critical)}
          />
          <SemiCircleGauge
            label="Gross Weight"
            value={frame.weight.gross}
            max={vehicle.maxGrossWeightKg}
            unit="kg"
            color={bandColor(frame.weight.gross, weightT.warning, weightT.critical)}
          />
          <SemiCircleGauge
            label="Container Temp"
            value={frame.temperature.containerCelsius}
            max={80}
            unit="°C"
            decimals={1}
            color={bandColor(frame.temperature.containerCelsius, THRESHOLDS.containerTemp.warning, THRESHOLDS.containerTemp.critical)}
          />
          <SemiCircleGauge
            label="Fuel"
            value={frame.engine.fuelLevelPercent}
            max={100}
            unit="%"
            color={bandColor(frame.engine.fuelLevelPercent, THRESHOLDS.fuelLevel.warning, THRESHOLDS.fuelLevel.critical, true)}
          />
        </div>
        <RatioGauge value={ratio} band={band} />
      </CardContent>
    </Card>
  );
}
