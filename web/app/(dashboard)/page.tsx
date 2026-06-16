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
import { Map, RefreshCw } from "lucide-react";

export default function DashboardHomePage() {
  const { vehicles, latestFrames, historyFrames, lastUpdate } = useTelemetry();

  return (
    <div className="space-y-3 md:space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Fleet Overview</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <RefreshCw className="h-3 w-3" /> Last update: {formatTime(lastUpdate)}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-2">
          <Link href="/map">
            <Map className="h-4 w-4" /> Full Map
          </Link>
        </Button>
      </div>

      <KpiCards vehicles={vehicles} telemetry={latestFrames} />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Live Fleet Map</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary gap-1">
              <Link href="/map">Open full map →</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 pb-0">
          <div className="h-64 sm:h-72 rounded-b-lg overflow-hidden">
            <FleetMap vehicles={vehicles} telemetry={latestFrames} interactive={false} />
          </div>
        </CardContent>
      </Card>

      <div>
        <FleetStatusTable vehicles={vehicles} telemetry={latestFrames} limit={5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RatioBarChart vehicles={vehicles} telemetry={latestFrames} />
        <TempSparklines vehicles={vehicles} history={historyFrames} />
      </div>
    </div>
  );
}
