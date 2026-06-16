"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { THRESHOLDS } from "@oiltrack/types";
import { formatNumber, formatTime } from "@/lib/formatters";

interface TemperatureLogProps {
  vehicles: Record<string, Vehicle>;
  history: Record<string, TelemetryFrame[]>;
}

export default function TemperatureLog({ vehicles, history }: TemperatureLogProps) {
  const summary = Object.values(vehicles).map((v) => {
    const frames = history[v.id] ?? [];
    const temps = frames.map((f) => f.temperature.containerCelsius);
    const min = temps.length ? Math.min(...temps) : 0;
    const max = temps.length ? Math.max(...temps) : 0;
    const avg = temps.length ? temps.reduce((a, b) => a + b, 0) / temps.length : 0;
    const breaches = frames.reduce((sum, f) => sum + f.alerts.filter((a) => a.type === "HIGH_CONTAINER_TEMP").length, 0);
    return { vehicle: v, min, max, avg, breaches };
  });

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-700">
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium text-right">Min (°C)</th>
              <th className="px-4 py-3 font-medium text-right">Avg (°C)</th>
              <th className="px-4 py-3 font-medium text-right">Max (°C)</th>
              <th className="px-4 py-3 font-medium text-right">High-Temp Alerts</th>
            </tr>
          </thead>
          <tbody>
            {summary.map(({ vehicle, min, max, avg, breaches }) => (
              <tr key={vehicle.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3 font-medium text-accent">{vehicle.id}</td>
                <td className="px-4 py-3 text-right text-text-primary">{formatNumber(min, 1)}</td>
                <td className="px-4 py-3 text-right text-text-primary">{formatNumber(avg, 1)}</td>
                <td className="px-4 py-3 text-right text-text-primary">{formatNumber(max, 1)}</td>
                <td className={`px-4 py-3 text-right font-medium ${breaches > 0 ? "text-danger" : "text-slate-500"}`}>
                  {breaches}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.values(vehicles).map((v) => {
          const frames = history[v.id] ?? [];
          const data = frames.map((f) => ({ time: formatTime(f.timestamp), temp: Math.round(f.temperature.containerCelsius * 10) / 10 }));
          return (
            <div key={v.id} className="bg-surface border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">{v.id} — Container Temperature</h3>
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="time" tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#334155" }} tickLine={false} minTickGap={40} />
                  <YAxis tick={{ fill: "#94A3B8", fontSize: 10 }} axisLine={{ stroke: "#334155" }} tickLine={false} width={40} domain={[35, 70]} />
                  <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
                  <ReferenceLine y={THRESHOLDS.containerTemp.warning} stroke="#F59E0B" strokeDasharray="4 4" />
                  <ReferenceLine y={THRESHOLDS.containerTemp.critical} stroke="#EF4444" strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="temp" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}
