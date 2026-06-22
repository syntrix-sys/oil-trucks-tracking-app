"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

function filterByDate(frames: TelemetryFrame[], from: string, to: string): TelemetryFrame[] {
  return frames.filter((f) => {
    const t = new Date(f.timestamp).getTime();
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime()) return false;
    return true;
  });
}

const TABS = [
  { value: "daily",       label: "Daily Summary"   },
  { value: "temperature", label: "Temperature"     },
  { value: "overweight",  label: "Overweight"      },
  { value: "speed",       label: "Speed Violations" },
];

export default function ReportsPage() {
  const { vehicles, latestFrames, historyFrames, activeAlerts } = useTelemetry();
  const [template, setTemplate] = useState("daily");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  // Paint-first gate: data props stay empty until after first render
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  /*
   * Lazy tab set: tracks which tabs have ever been activated.
   * A tab is rendered (and its heavy sub-component mounts) only on first visit.
   * After that it stays in the DOM but is hidden — no re-computation on switch.
   */
  const [visited, setVisited] = useState(new Set(["daily"]));

  function handleTabChange(value: string) {
    setTemplate(value);
    setVisited((prev) => {
      if (prev.has(value)) return prev;
      const next = new Set(prev);
      next.add(value);
      return next;
    });
  }

  const filteredHistory = useMemo(() => {
    if (!mounted) return {};
    if (!dateFrom && !dateTo) return historyFrames;
    const out: Record<string, TelemetryFrame[]> = {};
    for (const [id, frames] of Object.entries(historyFrames)) {
      out[id] = filterByDate(frames, dateFrom, dateTo);
    }
    return out;
  }, [mounted, historyFrames, dateFrom, dateTo]);

  const filteredAlerts = useMemo(() => {
    if (!mounted) return [];
    if (!dateFrom && !dateTo) return activeAlerts;
    return activeAlerts.filter((a) => {
      const t = new Date(a.triggeredAt).getTime();
      if (dateFrom && t < new Date(dateFrom).getTime()) return false;
      if (dateTo && t > new Date(dateTo).getTime()) return false;
      return true;
    });
  }, [mounted, activeAlerts, dateFrom, dateTo]);

  async function generatePdf() {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { scale: 1.5 });
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
    let remaining = imgHeight;
    let sY = 0;
    const pageH = pdf.internal.pageSize.getHeight() - 80;
    while (remaining > 0) {
      pdf.addImage(imgData, "PNG", 20, position - sY, imgWidth, imgHeight);
      remaining -= pageH;
      if (remaining > 0) { pdf.addPage(); sY += pageH; position = 20; }
    }
    pdf.save(`oiltrack-${template}-report.pdf`);
  }

  const skeleton = (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border p-4 space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );

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
              <Input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 text-xs w-auto" />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">To</Label>
              <Input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 text-xs w-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={reportRef}>
        <Tabs value={template} onValueChange={handleTabChange}>
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:flex sm:flex-row">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>

          {!mounted ? skeleton : (
            <div className="mt-4">
              {/* Each tab panel is rendered only after its first visit, then kept in DOM */}
              <div className={cn(template !== "daily" && "hidden")}>
                {visited.has("daily") && (
                  <DailyFleetSummary vehicles={vehicles} history={filteredHistory} latestFrames={latestFrames} />
                )}
              </div>
              <div className={cn(template !== "temperature" && "hidden")}>
                {visited.has("temperature") && (
                  <TemperatureLog vehicles={vehicles} history={filteredHistory} />
                )}
              </div>
              <div className={cn(template !== "overweight" && "hidden")}>
                {visited.has("overweight") && (
                  <AlertIncidentsReport vehicles={vehicles} alerts={filteredAlerts} alertType="WEIGHT_LIMIT_EXCEEDED" title="Overweight Incidents" />
                )}
              </div>
              <div className={cn(template !== "speed" && "hidden")}>
                {visited.has("speed") && (
                  <AlertIncidentsReport vehicles={vehicles} alerts={filteredAlerts} alertType="SPEED_LIMIT_EXCEEDED" title="Speed Violations" />
                )}
              </div>
            </div>
          )}
        </Tabs>
      </div>
    </div>
  );
}
