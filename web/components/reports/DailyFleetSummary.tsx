"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { STATUS_COLORS, formatNumber, statusLabel } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DailyFleetSummaryProps {
  vehicles: Record<string, Vehicle>;
  history: Record<string, TelemetryFrame[]>;
  latestFrames: Record<string, TelemetryFrame>;
}

const CHART_GRID   = "hsl(var(--border))";
const CHART_TICK   = "hsl(var(--muted-foreground))";
const TOOLTIP_STYLE = {
  backgroundColor: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  fontSize: 12,
  color: "hsl(var(--popover-foreground))",
};

export default function DailyFleetSummary({ vehicles, history, latestFrames }: DailyFleetSummaryProps) {
  const speedData = useMemo(() => Object.values(vehicles).map((v) => {
    const frames = history[v.id] ?? [];
    const avg = frames.length ? frames.reduce((s, f) => s + f.speed.current, 0) / frames.length : 0;
    const max = frames.reduce((m, f) => Math.max(m, f.speed.current), 0);
    return { id: v.id, avg: Math.round(avg * 10) / 10, max: Math.round(max * 10) / 10 };
  }), [vehicles, history]);

  const { statusCounts, pieData } = useMemo(() => {
    const counts = { moving: 0, idle: 0, stopped: 0, alert: 0 };
    Object.values(latestFrames).forEach((frame) => { counts[deriveVehicleStatus(frame)] += 1; });
    const pie = Object.entries(counts)
      .filter(([, c]) => c > 0)
      .map(([status, count]) => ({ name: statusLabel(status as keyof typeof counts), value: count, status }));
    return { statusCounts: counts, pieData: pie };
  }, [latestFrames]);

  const totalDistance = useMemo(() => Object.values(history).reduce((sum, frames) => {
    if (frames.length < 2) return sum;
    return sum + (frames[frames.length - 1].engine.odometerKm - frames[0].engine.odometerKm);
  }, 0), [history]);

  const activeAlertCount = useMemo(
    () => Object.values(latestFrames).reduce((s, f) => s + f.alerts.filter((a) => !a.acknowledged).length, 0),
    [latestFrames]
  );

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Vehicles" value={Object.keys(vehicles).length.toString()} />
        <KpiCard label="Currently Moving" value={statusCounts.moving.toString()} accent />
        <KpiCard label="Active Alerts" value={activeAlertCount.toString()} danger={activeAlertCount > 0} />
        <KpiCard label="Session Distance" value={`${formatNumber(totalDistance, 1)} km`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Speed bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Avg / Max Speed per Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={speedData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="id" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--accent))" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART_TICK }} />
                <Bar dataKey="avg" name="Avg km/h" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="max" name="Max km/h" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Fleet Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {pieData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: 12, color: CHART_TICK }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent, danger }: { label: string; value: string; accent?: boolean; danger?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{label}</p>
        <p className={`text-2xl font-bold ${danger ? "text-destructive" : accent ? "text-primary" : "text-foreground"}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
