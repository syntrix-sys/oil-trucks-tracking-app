"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Check, Download, FileText, RefreshCw } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

type SortKey = "time" | "vehicle" | "type" | "severity" | "status";

const ALL_SEVERITIES: AlertSeverity[] = ["info", "warning", "critical"];
const PAGE_SIZE = 50;

const SEV_VARIANT: Record<AlertSeverity, "info" | "warning" | "destructive"> = {
  info:     "info",
  warning:  "warning",
  critical: "destructive",
};

export default function AlertsPage() {
  const { vehicles, activeAlerts } = useTelemetry();
  const acknowledgeAllAlerts = useTelemetryStore((s) => s.acknowledgeAllAlerts);
  const acknowledgeAlert     = useTelemetryStore((s) => s.acknowledgeAlert);

  // Defer all data work until after the first paint so the page shell appears instantly
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // --- filter/sort state (instant UI response) ---
  const [vehicleFilter,   setVehicleFilter]   = useState<string>("all");
  const [severityFilter,  setSeverityFilter]  = useState<Set<AlertSeverity>>(new Set(ALL_SEVERITIES));
  const [dateFrom,        setDateFrom]        = useState("");
  const [dateTo,          setDateTo]          = useState("");
  const [sortKey,         setSortKey]         = useState<SortKey>("time");
  const [sortAsc,         setSortAsc]         = useState(false);
  const [page,            setPage]            = useState(1);
  const [selected,        setSelected]        = useState<Set<string>>(new Set());

  // useTransition — marks filter/sort updates as non-urgent so the page
  // renders immediately and the table updates in the background
  const [isPending, startTransition] = useTransition();

  // useDeferredValue — the expensive useMemo below reads these deferred
  // copies, so it never blocks the initial render or user interactions
  const dAlerts         = useDeferredValue(activeAlerts);
  const dVehicleFilter  = useDeferredValue(vehicleFilter);
  const dSeverityFilter = useDeferredValue(severityFilter);
  const dDateFrom       = useDeferredValue(dateFrom);
  const dDateTo         = useDeferredValue(dateTo);
  const dSortKey        = useDeferredValue(sortKey);
  const dSortAsc        = useDeferredValue(sortAsc);

  const tableRef = useRef<HTMLDivElement>(null);

  // Heavy work — skipped entirely until after first paint (mounted gate)
  const allRows = useMemo(() => {
    if (!mounted) return [];
    let list = [...dAlerts];
    if (dVehicleFilter !== "all") list = list.filter((a) => a.vehicleId === dVehicleFilter);
    list = list.filter((a) => dSeverityFilter.has(a.severity));
    if (dDateFrom) list = list.filter((a) => new Date(a.triggeredAt) >= new Date(dDateFrom));
    if (dDateTo)   list = list.filter((a) => new Date(a.triggeredAt) <= new Date(dDateTo));

    list.sort((a, b) => {
      let cmp = 0;
      if (dSortKey === "time")     cmp = new Date(a.triggeredAt).getTime() - new Date(b.triggeredAt).getTime();
      if (dSortKey === "vehicle")  cmp = a.vehicleId.localeCompare(b.vehicleId);
      if (dSortKey === "type")     cmp = a.type.localeCompare(b.type);
      if (dSortKey === "severity") cmp = a.severity.localeCompare(b.severity);
      if (dSortKey === "status")   cmp = Number(a.acknowledged) - Number(b.acknowledged);
      return dSortAsc ? cmp : -cmp;
    });
    return list;
  }, [mounted, dAlerts, dVehicleFilter, dSeverityFilter, dDateFrom, dDateTo, dSortKey, dSortAsc]);

  // Only the current page slice enters the DOM — prevents thousands of rows
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const pageRows   = useMemo(
    () => allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allRows, page]
  );

  // Wrap filter changes in a transition so navigation stays snappy
  function applyFilter(fn: () => void) {
    startTransition(() => { fn(); setPage(1); });
  }

  function toggleSort(key: SortKey) {
    startTransition(() => {
      if (sortKey === key) setSortAsc((a) => !a);
      else { setSortKey(key); setSortAsc(false); }
      setPage(1);
    });
  }

  function toggleSeverity(sev: AlertSeverity) {
    applyFilter(() =>
      setSeverityFilter((prev) => {
        const next = new Set(prev);
        next.has(sev) ? next.delete(sev) : next.add(sev);
        return next;
      })
    );
  }

  function toggleSelectAll() {
    setSelected(selected.size === pageRows.length ? new Set() : new Set(pageRows.map((r) => r.id)));
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

  // CSV exports ALL filtered rows, not just the current page
  function exportCsv() {
    const headers = ["time", "vehicle", "type", "severity", "message", "status"];
    const csvRows = allRows.map((a) =>
      [a.triggeredAt, a.vehicleId, a.type, a.severity,
       `"${a.message.replace(/"/g, '""')}"`,
       a.acknowledged ? "acknowledged" : "open"].join(",")
    );
    const blob = new Blob([[headers.join(","), ...csvRows].join("\n")], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement("a"), { href: url, download: "oiltrack-alerts.csv" }).click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (!tableRef.current) return;
    const canvas  = await html2canvas(tableRef.current, { backgroundColor: "#1E293B", scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf     = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pw      = pdf.internal.pageSize.getWidth();
    const iw      = pw - 40;
    const ih      = (canvas.height * iw) / canvas.width;
    pdf.setFontSize(14);
    pdf.text("OilTrack Pro — Alert Report", 20, 24);
    pdf.addImage(imgData, "PNG", 20, 36, iw, Math.min(ih, pdf.internal.pageSize.getHeight() - 60));
    pdf.save("oiltrack-alerts.pdf");
  }

  // Sliding window of page buttons (max 5 visible)
  const pageButtons = useMemo(() => {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);
  }, [page, totalPages]);

  const columns: { key: SortKey; label: string }[] = [
    { key: "time",     label: "Time"     },
    { key: "vehicle",  label: "Vehicle"  },
    { key: "type",     label: "Type"     },
    { key: "severity", label: "Severity" },
    { key: "status",   label: "Status"   },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            Alerts
            {isPending && <RefreshCw className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allRows.length.toLocaleString()} alerts
            {allRows.length !== activeAlerts.length && (
              <span className="ml-1 text-muted-foreground/60">
                (filtered from {activeAlerts.length.toLocaleString()} total)
              </span>
            )}
          </p>
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
              <Select value={vehicleFilter} onValueChange={(v) => applyFilter(() => setVehicleFilter(v))}>
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
                onChange={(e) => applyFilter(() => setDateFrom(e.target.value))}
                className="h-8 text-xs w-auto"
              />
            </div>

            <div>
              <Label className="text-xs mb-1.5 block">To</Label>
              <Input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => applyFilter(() => setDateTo(e.target.value))}
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

      {/* Table */}
      <div ref={tableRef}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">Alert Log</CardTitle>
              {totalPages > 1 && (
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} &middot; {PAGE_SIZE} per page
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ScrollArea className="rounded-b-lg">
              <div className={cn("overflow-x-auto transition-opacity duration-150", isPending && "opacity-60 pointer-events-none")}>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-4 py-3 font-medium w-10">
                        <Checkbox
                          checked={pageRows.length > 0 && selected.size === pageRows.length}
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
                            {sortKey === key && (sortAsc
                              ? <ArrowUp className="w-3 h-3" />
                              : <ArrowDown className="w-3 h-3" />)}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Message</th>
                    </tr>
                  </thead>

                  <tbody>
                    {!mounted ? (
                      Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="px-4 py-3"><Skeleton className="h-4 w-4 rounded" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-3.5 w-32" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-3.5 w-16" /></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><Skeleton className="h-3.5 w-28" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                          <td className="px-4 py-3"><Skeleton className="h-3.5 w-20" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><Skeleton className="h-3.5 w-48" /></td>
                        </tr>
                      ))
                    ) : (
                      <>
                        {pageRows.map((alert) => (
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
                        {pageRows.length === 0 && !isPending && (
                          <tr>
                            <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                              No alerts match the current filters.
                            </td>
                          </tr>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </ScrollArea>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Showing {((page - 1) * PAGE_SIZE + 1).toLocaleString()}–{Math.min(page * PAGE_SIZE, allRows.length).toLocaleString()} of {allRows.length.toLocaleString()}
                </span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage(1)} disabled={page === 1}>«</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>‹</Button>
                  {pageButtons.map((p) => (
                    <Button
                      key={p}
                      variant={p === page ? "default" : "outline"}
                      size="sm"
                      className="h-7 w-7 p-0 text-xs"
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>›</Button>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => setPage(totalPages)} disabled={page === totalPages}>»</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
