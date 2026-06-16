"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { THRESHOLDS } from "@oiltrack/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TempSparklinesProps {
  vehicles: Record<string, Vehicle>;
  history: Record<string, TelemetryFrame[]>;
}

export default function TempSparklines({ vehicles, history }: TempSparklinesProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Container Temperature — Fleet</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.values(vehicles).map((vehicle) => {
            const frames = history[vehicle.id] ?? [];
            const data = frames.slice(-150).map((f) => ({ temp: f.temperature.containerCelsius }));
            const latest = frames.length ? frames[frames.length - 1].temperature.containerCelsius : null;
            const isCritical = latest !== null && latest >= THRESHOLDS.containerTemp.critical;
            const isHot = latest !== null && latest >= THRESHOLDS.containerTemp.warning;
            const color = isCritical ? "#EF4444" : isHot ? "#F59E0B" : "#3B82F6";

            return (
              <div key={vehicle.id} className="space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground">{vehicle.id}</span>
                  <span className="text-sm font-semibold" style={{ color }}>
                    {latest !== null ? `${latest.toFixed(1)}°C` : "--"}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={36}>
                  <LineChart data={data}>
                    <YAxis hide domain={[35, 70]} />
                    <Line type="monotone" dataKey="temp" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
