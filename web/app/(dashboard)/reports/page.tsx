"use client";

import { useMemo, useRef, useState } from "react";
import { FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { TelemetryFrame } from "@oiltrack/types";
import { useTelemetry } from "@/lib/useTelemetry";
import DailyFleetSummary from "@/components/reports/DailyFleetSummary";
import TemperatureLog from "@/components/reports/TemperatureLog";
import AlertIncidentsReport from "@/components/reports/AlertIncidentsReport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function filterByDate(frames: TelemetryFrame[], from: string, to: string): TelemetryFrame[] {
  return frames.filter((f) => {
    const t = new Date(f.timestamp).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime()) return false;
    return true;
  });
}

export default function ReportsPage() {
  const { vehicles, latestFrames, historyFrames, activeAlerts } = useTelemetry();
  const [template, setTemplate] = useState("daily");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  const filteredHistory = useMemo(() => {
    if (!dateFrom && !dateTo) return historyFrames;
    const out: Record<string, TelemetryFrame[]> = {};
    for (const [id, frames] of Object.entries(historyFrames)) {
      out[id] = filterByDate(frames, dateFrom, dateTo);
    }
    return out;
  }, [historyFrames, dateFrom, dateTo]);

  const filteredAlerts = useMemo(() => {
    if (!dateFrom && !dateTo) return activeAlerts;
    return activeAlerts.filter((a) => {
      const t = new Date(a.triggeredAt).getTime();
      if (dateFrom && t < new Date(dateFrom).getTime()) return false;
      if (dateTo && t > new Date(dateTo).getTime()) return false;
      return true;
    });
  }, [activeAlerts, dateFrom, dateTo]);

  async function generatePdf() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { backgroundColor: "#0F172A", scale: 1.5 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.setFontSize(16);
    pdf.text("OilTrack Pro — Report", 20, 28);
    pdf.setFontSize(10);
    pdf.text(new Date().toLocaleString(), 20, 44);
    let position = 60;
    let remainingHeight = imgHeight;
    let sY = 0;
    const pageContentHeight = pdf.internal.pageSize.getHeight() - 80;
    while (remainingHeight > 0) {
      pdf.addImage(imgData, "PNG", 20, position - sY, imgWidth, imgHeight);
      remainingHeight -= pageContentHeight;
      if (remainingHeight > 0) { pdf.addPage(); sY += pageContentHeight; position = 20; }
    }
    pdf.save(`oiltrack-${template}-report.pdf`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Reports</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Generate and export fleet reports</p>
        </div>
        <Button onClick={generatePdf} className="gap-1.5">
          <FileText className="h-4 w-4" /> Generate PDF
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="text-xs mb-1.5 block">From</Label>
              <Input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs w-auto"
              />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">To</Label>
              <Input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs w-auto"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <Tabs value={template} onValueChange={setTemplate}>
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-row">
            <TabsTrigger value="daily">Daily Summary</TabsTrigger>
            <TabsTrigger value="temperature">Temperature</TabsTrigger>
            <TabsTrigger value="overweight">Overweight</TabsTrigger>
            <TabsTrigger value="speed">Speed Violations</TabsTrigger>
          </TabsList>

          <TabsContent value="daily" className="mt-4">
            <DailyFleetSummary vehicles={vehicles} history={filteredHistory} latestFrames={latestFrames} />
          </TabsContent>
          <TabsContent value="temperature" className="mt-4">
            <TemperatureLog vehicles={vehicles} history={filteredHistory} />
          </TabsContent>
          <TabsContent value="overweight" className="mt-4">
            <AlertIncidentsReport
              vehicles={vehicles}
              alerts={filteredAlerts}
              alertType="WEIGHT_LIMIT_EXCEEDED"
              title="Overweight Incidents"
            />
          </TabsContent>
          <TabsContent value="speed" className="mt-4">
            <AlertIncidentsReport
              vehicles={vehicles}
              alerts={filteredAlerts}
              alertType="SPEED_LIMIT_EXCEEDED"
              title="Speed Violations"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
