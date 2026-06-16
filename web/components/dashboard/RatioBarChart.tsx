"use client";

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { speedWeightRatio, ratioBand, THRESHOLDS } from "@oiltrack/types";
import { RATIO_BAND_COLORS } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RatioBarChartProps {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
}

export default function RatioBarChart({ vehicles, telemetry }: RatioBarChartProps) {
  const data = Object.values(vehicles)
    .filter((v) => telemetry[v.id])
    .map((v) => {
      const frame = telemetry[v.id];
      const ratio = speedWeightRatio(frame.speed.current, frame.weight.gross);
      return { id: v.id, ratio: Math.round(ratio * 100) / 100, band: ratioBand(ratio) };
    });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Speed / Weight Ratio — Fleet</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="id" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} domain={[0, 4]} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: 12 }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <ReferenceLine y={THRESHOLDS.ratio.caution}  stroke="#F59E0B" strokeDasharray="4 4" />
            <ReferenceLine y={THRESHOLDS.ratio.warning}  stroke="#F97316" strokeDasharray="4 4" />
            <ReferenceLine y={THRESHOLDS.ratio.critical} stroke="#EF4444" strokeDasharray="4 4" />
            <Bar dataKey="ratio" radius={[4, 4, 0, 0]}>
              {data.map((entry) => <Cell key={entry.id} fill={RATIO_BAND_COLORS[entry.band]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
