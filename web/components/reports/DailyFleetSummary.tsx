"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { STATUS_COLORS, formatNumber, statusLabel } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";

interface DailyFleetSummaryProps {
  vehicles: Record<string, Vehicle>;
  history: Record<string, TelemetryFrame[]>;
  latestFrames: Record<string, TelemetryFrame>;
}

export default function DailyFleetSummary({ vehicles, history, latestFrames }: DailyFleetSummaryProps) {
  const speedData = Object.values(vehicles).map((v) => {
    const frames = history[v.id] ?? [];
    const avg = frames.length ? frames.reduce((s, f) => s + f.speed.current, 0) / frames.length : 0;
    const max = frames.reduce((m, f) => Math.max(m, f.speed.current), 0);
    return { id: v.id, avg: Math.round(avg * 10) / 10, max: Math.round(max * 10) / 10 };
  });

  const statusCounts = { moving: 0, idle: 0, stopped: 0, alert: 0 };
  Object.values(latestFrames).forEach((frame) => {
    statusCounts[deriveVehicleStatus(frame)] += 1;
  });
  const pieData = Object.entries(statusCounts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: statusLabel(status as keyof typeof statusCounts), value: count, status }));

  const totalDistance = Object.values(history).reduce((sum, frames) => {
    if (frames.length < 2) return sum;
    return sum + (frames[frames.length - 1].engine.odometerKm - frames[0].engine.odometerKm);
  }, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Vehicles" value={Object.keys(vehicles).length.toString()} />
        <SummaryCard label="Currently Moving" value={statusCounts.moving.toString()} />
        <SummaryCard label="Active Alerts" value={Object.values(latestFrames).reduce((s, f) => s + f.alerts.filter((a) => !a.acknowledged).length, 0).toString()} />
        <SummaryCard label="Distance Covered (Session)" value={`${formatNumber(totalDistance, 1)} km`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Average / Max Speed per Vehicle</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="id" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="avg" name="Avg km/h" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" name="Max km/h" fill="#F4A01C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-surface border border-slate-700 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Fleet Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                {pieData.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface border border-slate-700 rounded-xl p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}
