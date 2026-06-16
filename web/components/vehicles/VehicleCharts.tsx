"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { THRESHOLDS, speedThresholds, grossWeightThresholds, speedWeightRatio } from "@oiltrack/types";
import { formatTime } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface VehicleChartsProps {
  vehicle: Vehicle;
  history: TelemetryFrame[];
}

type Window = "15m" | "30m" | "1h" | "session";

const WINDOWS: { key: Window; label: string; ticks?: number }[] = [
  { key: "15m",     label: "15 min", ticks: 450 },
  { key: "30m",     label: "30 min", ticks: 900 },
  { key: "1h",      label: "1 hr",   ticks: 1800 },
  { key: "session", label: "Session" },
];

export default function VehicleCharts({ vehicle, history }: VehicleChartsProps) {
  const [activeWindow, setActiveWindow] = useState<Window>("30m");

  const data = useMemo(() => {
    const def = WINDOWS.find((w) => w.key === activeWindow);
    const slice = def?.ticks ? history.slice(-def.ticks) : history;
    return slice.map((f) => ({
      time: formatTime(f.timestamp),
      speed: Math.round(f.speed.current * 10) / 10,
      gross: Math.round(f.weight.gross),
      containerTemp: Math.round(f.temperature.containerCelsius * 10) / 10,
      ratio: Math.round(speedWeightRatio(f.speed.current, f.weight.gross) * 100) / 100,
      fuel: Math.round(f.engine.fuelLevelPercent * 10) / 10,
    }));
  }, [history, activeWindow]);

  const speedT = speedThresholds(vehicle.maxSpeedKmh);
  const weightT = grossWeightThresholds(vehicle.maxGrossWeightKg);

  function downloadCsv() {
    const headers = ["time", "speed_kmh", "gross_weight_kg", "container_temp_c", "ratio", "fuel_percent"];
    const rows = data.map((d) => [d.time, d.speed, d.gross, d.containerTemp, d.ratio, d.fuel].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${vehicle.id}-telemetry-${activeWindow}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Telemetry History</CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-secondary border border-border rounded-lg overflow-hidden">
              {WINDOWS.map((w) => (
                <button
                  key={w.key}
                  onClick={() => setActiveWindow(w.key)}
                  className={cn(
                    "px-2.5 py-1.5 text-xs transition-colors",
                    activeWindow === w.key ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs" onClick={downloadCsv}>
              <Download className="h-3.5 w-3.5" /> CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ChartBlock title="Speed (km/h)" data={data} dataKey="speed" color="#3B82F6" thresholds={[speedT.warning, speedT.critical]} />
        <ChartBlock title="Gross Weight (kg)" data={data} dataKey="gross" color="#F4A01C" thresholds={[weightT.warning, weightT.critical]} />
        <ChartBlock
          title="Container Temperature (°C)"
          data={data}
          dataKey="containerTemp"
          color="#EF4444"
          thresholds={[THRESHOLDS.containerTemp.warning, THRESHOLDS.containerTemp.critical]}
        />
        <ChartBlock
          title="Speed/Weight Ratio"
          data={data}
          dataKey="ratio"
          color="#22C55E"
          thresholds={[THRESHOLDS.ratio.caution, THRESHOLDS.ratio.warning, THRESHOLDS.ratio.critical]}
        />
      </CardContent>
    </Card>
  );
}

interface ChartBlockProps {
  title: string;
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
  thresholds?: number[];
}

function ChartBlock({ title, data, dataKey, color, thresholds }: ChartBlockProps) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
          <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} width={45} />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12 }}
            labelStyle={{ color: "var(--foreground)" }}
          />
          {thresholds?.map((t, i) => (
            <ReferenceLine key={i} y={t} stroke="#F59E0B" strokeDasharray="4 4" />
          ))}
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
