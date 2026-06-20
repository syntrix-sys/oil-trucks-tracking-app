"use client";

import Link from "next/link";
import { useTelemetry } from "@/lib/useTelemetry";
import KpiCards from "@/components/dashboard/KpiCards";
import FleetStatusTable from "@/components/dashboard/FleetStatusTable";
import RatioBarChart from "@/components/dashboard/RatioBarChart";
import TempSparklines from "@/components/dashboard/TempSparklines";
import FleetMap from "@/components/map/FleetMap";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTime } from "@/lib/formatters";
import { Map, RefreshCw, ArrowUpRight } from "lucide-react";

export default function DashboardHomePage() {
  const { vehicles, latestFrames, historyFrames, lastUpdate, cargoLitresOverrides } = useTelemetry();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-foreground tracking-tight">Fleet Overview</h1>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium">
            <RefreshCw className="h-2.5 w-2.5" />
            Updated {formatTime(lastUpdate)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-1.5">
          <Link href="/map"><Map className="h-3 w-3" /> Full Map</Link>
        </Button>
      </div>

      <KpiCards vehicles={vehicles} telemetry={latestFrames} cargoLitresOverrides={cargoLitresOverrides} />

      {/* Map preview */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>Live Fleet Map</CardTitle>
            <Button asChild variant="ghost" size="xs" className="text-primary gap-1">
              <Link href="/map">Full map <ArrowUpRight className="h-3 w-3" /></Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-0">
          <div className="h-52 sm:h-60 rounded-b-xl overflow-hidden">
            <FleetMap vehicles={vehicles} telemetry={latestFrames} interactive={false} />
          </div>
        </CardContent>
      </Card>

      <FleetStatusTable vehicles={vehicles} telemetry={latestFrames} limit={5} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RatioBarChart vehicles={vehicles} telemetry={latestFrames} />
        <TempSparklines vehicles={vehicles} history={historyFrames} />
      </div>
    </div>
  );
}
