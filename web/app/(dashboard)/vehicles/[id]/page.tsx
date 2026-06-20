"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTelemetry, useVehicleHistory } from "@/lib/useTelemetry";
import VehicleSummaryCard from "@/components/vehicles/VehicleSummaryCard";
import TelemetryGauges from "@/components/vehicles/TelemetryGauges";
import VehicleCharts from "@/components/vehicles/VehicleCharts";
import AlertsPanel from "@/components/vehicles/AlertsPanel";
import LoadLogPanel from "@/components/vehicles/LoadLogPanel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export default function VehicleDetailPage() {
  const params = useParams<{ id: string }>();
  const vehicleId = params.id;

  const { vehicles, latestFrames, activeAlerts, loadEntries } = useTelemetry();
  const history = useVehicleHistory(vehicleId);

  const vehicle = vehicles[vehicleId];
  const frame = latestFrames[vehicleId];
  const vehicleAlerts = activeAlerts.filter((a) => a.vehicleId === vehicleId);
  const vehicleLoadEntries = loadEntries[vehicleId] ?? [];

  if (!vehicle || !frame) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-muted-foreground">Loading vehicle data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/vehicles"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">{vehicle.id}</h1>
          <p className="text-xs text-muted-foreground">{vehicle.registrationNumber} · {vehicle.make} {vehicle.model}</p>
        </div>
      </div>

      {/* Mobile: Tabs layout */}
      <div className="block lg:hidden">
        <Tabs defaultValue="summary">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary">Info</TabsTrigger>
            <TabsTrigger value="telemetry">Live</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="load">Load</TabsTrigger>
          </TabsList>
          <TabsContent value="summary" className="mt-4">
            <VehicleSummaryCard vehicle={vehicle} frame={frame} />
          </TabsContent>
          <TabsContent value="telemetry" className="mt-4">
            <TelemetryGauges vehicle={vehicle} frame={frame} />
          </TabsContent>
          <TabsContent value="charts" className="mt-4">
            <VehicleCharts vehicle={vehicle} history={history} />
          </TabsContent>
          <TabsContent value="alerts" className="mt-4">
            <AlertsPanel vehicle={vehicle} alerts={vehicleAlerts} />
          </TabsContent>
          <TabsContent value="load" className="mt-4">
            <LoadLogPanel vehicle={vehicle} entries={vehicleLoadEntries} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: grid */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-4">
        <VehicleSummaryCard vehicle={vehicle} frame={frame} />
        <TelemetryGauges vehicle={vehicle} frame={frame} />
        <VehicleCharts vehicle={vehicle} history={history} />
        <AlertsPanel vehicle={vehicle} alerts={vehicleAlerts} />
      </div>
      <div className="hidden lg:block">
        <LoadLogPanel vehicle={vehicle} entries={vehicleLoadEntries} />
      </div>
    </div>
  );
}
