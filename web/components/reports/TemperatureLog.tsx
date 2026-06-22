"use client";

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { THRESHOLDS } from "@oiltrack/types";
import { formatNumber, formatTime } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TemperatureLogProps {
  vehicles: Record<string, Vehicle>;
  history: Record<string, TelemetryFrame[]>;
}

const CHART_GRID    = "hsl(var(--border))";
const CHART_TICK    = "hsl(var(--muted-foreground))";
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

export default function TemperatureLog({ vehicles, history }: TemperatureLogProps) {
  const summary = useMemo(() => Object.values(vehicles).map((v) => {
    const frames = history[v.id] ?? [];
    const temps  = frames.map((f) => f.temperature.containerCelsius);
    const min    = temps.length ? Math.min(...temps) : 0;
    const max    = temps.length ? Math.max(...temps) : 0;
    const avg    = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const breaches = frames.reduce(
      (sum, f) => sum + f.alerts.filter((a) => a.type === "HIGH_CONTAINER_TEMP").length, 0
    );
    return { vehicle: v, min, max, avg, breaches };
  }), [vehicles, history]);

  const chartDataMap = useMemo(() => {
    const map: Record<string, { time: string; temp: number }[]> = {};
    for (const v of Object.values(vehicles)) {
      const frames = history[v.id] ?? [];
      map[v.id] = frames.map((f) => ({
        time: formatTime(f.timestamp),
        temp: Math.round(f.temperature.containerCelsius * 10) / 10,
      }));
    }
    return map;
  }, [vehicles, history]);

  return (
    <div className="space-y-4">
      {/* Summary table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-left">Vehicle</th>
                  <th className="px-4 py-3 font-medium text-right">Min (°C)</th>
                  <th className="px-4 py-3 font-medium text-right">Avg (°C)</th>
                  <th className="px-4 py-3 font-medium text-right">Max (°C)</th>
                  <th className="px-4 py-3 font-medium text-right">High-Temp Alerts</th>
                </tr>
              </thead>
              <tbody>
                {summary.map(({ vehicle, min, max, avg, breaches }) => (
                  <tr key={vehicle.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">{vehicle.id}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumber(min, 1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumber(avg, 1)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">{formatNumber(max, 1)}</td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums ${breaches > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {breaches}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Per-vehicle temperature charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.values(vehicles).map((v) => (
          <Card key={v.id}>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">{v.id} — Container Temperature</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={chartDataMap[v.id] ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: CHART_TICK, fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tick={{ fill: CHART_TICK, fontSize: 10 }} axisLine={false} tickLine={false} width={36} domain={[35, 70]} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} />
                  <ReferenceLine y={THRESHOLDS.containerTemp.warning}  stroke="#F59E0B" strokeDasharray="4 4" strokeWidth={1.5} />
                  <ReferenceLine y={THRESHOLDS.containerTemp.critical} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="temp" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
