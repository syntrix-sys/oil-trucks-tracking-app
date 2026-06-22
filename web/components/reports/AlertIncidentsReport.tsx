"use client";

import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alert, AlertType, Vehicle } from "@oiltrack/types";
import { formatDateTime, SEVERITY_COLORS } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AlertIncidentsReportProps {
  vehicles: Record<string, Vehicle>;
  alerts: Alert[];
  alertType: AlertType;
  title: string;
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

const SEV_VARIANT: Record<string, "info" | "warning" | "destructive"> = {
  info:     "info",
  warning:  "warning",
  critical: "destructive",
};

export default function AlertIncidentsReport({ vehicles, alerts, alertType, title }: AlertIncidentsReportProps) {
  const incidents = useMemo(() =>
    alerts
      .filter((a) => a.type === alertType)
      .sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()),
    [alerts, alertType]
  );

  const countsByVehicle = useMemo(() =>
    Object.keys(vehicles).map((id) => ({
      id,
      count: incidents.filter((a) => a.vehicleId === id).length,
    })),
    [vehicles, incidents]
  );

  return (
    <div className="space-y-4">
      {/* Bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title} — Incidents per Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={countsByVehicle} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} vertical={false} />
              <XAxis dataKey="id" tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: CHART_TICK, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--accent))" }} />
              <Bar dataKey="count" name="Incidents" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Incident log table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 font-medium text-left">Time</th>
                  <th className="px-4 py-3 font-medium text-left">Vehicle</th>
                  <th className="px-4 py-3 font-medium text-left">Severity</th>
                  <th className="px-4 py-3 font-medium text-left hidden md:table-cell">Message</th>
                </tr>
              </thead>
              <tbody>
                {incidents.map((alert) => (
                  <tr key={alert.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3 text-foreground/70 whitespace-nowrap text-xs">
                      {formatDateTime(alert.triggeredAt)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary text-xs">{alert.vehicleId}</td>
                    <td className="px-4 py-3">
                      <Badge variant={SEV_VARIANT[alert.severity] ?? "secondary"}>
                        {alert.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground/70 text-xs hidden md:table-cell max-w-xs truncate">
                      {alert.message}
                    </td>
                  </tr>
                ))}
                {incidents.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-muted-foreground">
                      No incidents recorded this session.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
