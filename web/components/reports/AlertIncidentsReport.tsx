"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alert, AlertType, Vehicle } from "@oiltrack/types";
import { formatDateTime, SEVERITY_COLORS } from "@/lib/formatters";

interface AlertIncidentsReportProps {
  vehicles: Record<string, Vehicle>;
  alerts: Alert[];
  alertType: AlertType;
  title: string;
}

export default function AlertIncidentsReport({ vehicles, alerts, alertType, title }: AlertIncidentsReportProps) {
  const incidents = alerts
    .filter((a) => a.type === alertType)
    .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());

  const countsByVehicle = Object.keys(vehicles).map((id) => ({
    id,
    count: incidents.filter((a) => a.vehicleId === id).length,
  }));

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3">{title} — Incidents per Vehicle</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={countsByVehicle}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="id" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} />
            <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "#334155" }} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ backgroundColor: "#1E293B", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="count" name="Incidents" fill="#EF4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-surface border border-slate-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase text-slate-400 border-b border-slate-700">
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Vehicle</th>
              <th className="px-4 py-3 font-medium">Severity</th>
              <th className="px-4 py-3 font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((alert) => (
              <tr key={alert.id} className="border-b border-slate-800 last:border-0">
                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{formatDateTime(alert.triggeredAt)}</td>
                <td className="px-4 py-3 font-medium text-accent">{alert.vehicleId}</td>
                <td className="px-4 py-3">
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded-full"
                    style={{ color: SEVERITY_COLORS[alert.severity], backgroundColor: `${SEVERITY_COLORS[alert.severity]}22` }}
                  >
                    {alert.severity.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-300">{alert.message}</td>
              </tr>
            ))}
            {incidents.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                  No incidents recorded this session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
