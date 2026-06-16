"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Download, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import type { AlertSeverity } from "@oiltrack/types";
import { useTelemetry } from "@/lib/useTelemetry";
import { useTelemetryStore } from "@/store/telemetryStore";
import { SEVERITY_COLORS, formatDateTime } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type SortKey = "time" | "vehicle" | "type" | "severity" | "status";

const ALL_SEVERITIES: AlertSeverity[] = ["info", "warning", "critical"];

const SEV_VARIANT: Record<AlertSeverity, "info" | "warning" | "destructive"> = {
  info:     "info",
  warning:  "warning",
  critical: "destructive",
};

export default function AlertsPage() {
  const { vehicles, activeAlerts } = useTelemetry();
  const acknowledgeAllAlerts = useTelemetryStore((s) => s.acknowledgeAllAlerts);
  const acknowledgeAlert = useTelemetryStore((s) => s.acknowledgeAlert);

  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<Set<AlertSeverity>>(new Set(ALL_SEVERITIES));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const tableRef = useRef<HTMLDivElement>(null);

  const rows = useMemo(() => {
    let list = [...activeAlerts];
    if (vehicleFilter !== "all") list = list.filter((a) => a.vehicleId === vehicleFilter);
    list = list.filter((a) => severityFilter.has(a.severity));
    if (dateFrom) list = list.filter((a) => new Date(a.triggeredAt).getTime() >= new Date(dateFrom).getTime());
    if (dateTo)   list = list.filter((a) => new Date(a.triggeredAt).getTime() <= new Date(dateTo).getTime());

    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "time")     cmp = new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime();
      if (sortKey === "vehicle")  cmp = a.vehicleId.localeCompare(b.vehicleId);
      if (sortKey === "type")     cmp = a.type.localeCompare(b.type);
      if (sortKey === "severity") cmp = a.severity.localeCompare(b.severity);
      if (sortKey === "status")   cmp = Number(a.acknowledged) - Number(b.acknowledged);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [activeAlerts, vehicleFilter, severityFilter, dateFrom, dateTo, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  function toggleSeverity(sev: AlertSeverity) {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      next.has(sev) ? next.delete(sev) : next.add(sev);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected(selected.size === rows.length ? new Set() : new Set(rows.map((r) => r.id)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function bulkAcknowledge() {
    acknowledgeAllAlerts(Array.from(selected));
    setSelected(new Set());
  }

  function exportCsv() {
    const headers = ["time", "vehicle", "type", "severity", "message", "status"];
    const csvRows = rows.map((a) =>
      [a.triggeredAt, a.vehicleId, a.type, a.severity, `"${a.message.replace(/"/g, '""')}"`, a.acknowledged ? "acknowledged" : "open"].join(",")
    );
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "oiltrack-alerts.csv" }).click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current, { backgroundColor: "#1E293B", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.setFontSize(14);
    pdf.text("OilTrack Pro — Alert Report", 20, 24);
    pdf.addImage(imgData, "PNG", 20, 36, imgWidth, Math.min(imgHeight, pdf.internal.pageSize.getHeight() - 60));
    pdf.save("oiltrack-alerts.pdf");
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "time", label: "Time" },
    { key: "vehicle", label: "Vehicle" },
    { key: "type", label: "Type" },
    { key: "severity", label: "Severity" },
    { key: "status", label: "Status" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Alerts</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{rows.length} alerts</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button size="sm" className="gap-1.5" onClick={bulkAcknowledge}>
              <Check className="h-3.5 w-3.5" /> Acknowledge {selected.size}
            </Button>
          )}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCsv}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPdf}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-[140px]">
              <Label className="text-xs mb-1.5 block">Vehicle</Label>
              <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="All Vehicles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {Object.keys(vehicles).map((id) => (
                    <SelectItem key={id} value={id}>{id}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            <div>
              <Label className="text-xs mb-1.5 block">Severity</Label>
              <div className="flex gap-1">
                {ALL_SEVERITIES.map((sev) => (
                  <button
                    key={sev}
                    onClick={() => toggleSeverity(sev)}
                    className={cn(
                      "text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all",
                      severityFilter.has(sev) ? "opacity-100" : "opacity-40"
                    )}
                    style={{
                      color: SEVERITY_COLORS[sev],
                      borderColor: severityFilter.has(sev) ? SEVERITY_COLORS[sev] : "var(--border)",
                      backgroundColor: severityFilter.has(sev) ? `${SEVERITY_COLORS[sev]}15` : "transparent",
                    }}
                  >
                    {sev.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div ref={tableRef}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alert Log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="rounded-b-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium w-10">
                        <Checkbox
                          checked={rows.length > 0 && selected.size === rows.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      {columns.map(({ key, label }) => (
                        <th
                          key={key}
                          onClick={() => toggleSort(key)}
                          className="px-4 py-3 text-left font-medium cursor-pointer select-none hover:text-foreground transition-colors"
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortKey === key && (sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((alert) => (
                      <tr
                        key={alert.id}
                        className={cn(
                          "border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors",
                          alert.severity === "critical" && !alert.acknowledged && "bg-destructive/5"
                        )}
                      >
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={selected.has(alert.id)}
                            onCheckedChange={() => toggleSelect(alert.id)}
                          />
                        </td>
                        <td className="px-4 py-3 text-foreground/80 whitespace-nowrap">{formatDateTime(alert.triggeredAt)}</td>
                        <td className="px-4 py-3 font-medium text-primary">{alert.vehicleId}</td>
                        <td className="px-4 py-3 text-foreground/80 hidden sm:table-cell">
                          {alert.type.replace(/_/g, " ")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={SEV_VARIANT[alert.severity]}>{alert.severity}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {alert.acknowledged ? (
                            <span className="text-xs text-muted-foreground">Acknowledged</span>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs text-primary px-2"
                              onClick={() => acknowledgeAlert(alert.id)}
                            >
                              Acknowledge
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground/80 max-w-xs truncate hidden md:table-cell">
                          {alert.message}
                        </td>
                      </tr>
                    ))}
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No alerts match the current filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
