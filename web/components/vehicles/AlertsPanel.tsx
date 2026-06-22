"use client";

import { useState } from "react";
import { AlertTriangle, Check, Send } from "lucide-react";
import type { Alert, Vehicle } from "@oiltrack/types";
import { useTelemetryStore } from "@/store/telemetryStore";
import { SEVERITY_COLORS, formatTime } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const SEV_VARIANT: Record<string, "destructive" | "warning" | "info"> = {
  critical: "destructive",
  warning:  "warning",
  info:     "info",
};

interface AlertsPanelProps {
  vehicle: Vehicle;
  alerts: Alert[];
}

export default function AlertsPanel({ vehicle, alerts }: AlertsPanelProps) {
  const acknowledgeAlert = useTelemetryStore((s) => s.acknowledgeAlert);
  const [toast, setToast] = useState<string | null>(null);

  const sorted = [...alerts].sort((a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime());
  const active = sorted.filter((a) => !a.acknowledged);

  function handleSendWarning() {
    setToast(`Warning sent to ${vehicle.driver.name} (${vehicle.driver.phone}).`);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Alerts</CardTitle>
            {active.length > 0 && (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5">{active.length}</Badge>
            )}
          </div>
          <Button onClick={handleSendWarning} size="sm" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Send Warning
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 p-0">
        <div className="overflow-y-auto max-h-[calc(100vh-220px)] min-h-[320px] px-4 pb-4">
          {toast && (
            <div className="text-xs bg-success/15 text-success border border-success/20 rounded-lg px-3 py-2 mb-3">
              {toast}
            </div>
          )}

          {/* Active alerts */}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 pt-1">
            Active ({active.length})
          </p>
          {active.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2 mb-3">No active alerts.</p>
          ) : (
            <div className="space-y-2 mb-4">
              {active.map((alert) => (
                <div key={alert.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      <AlertTriangle
                        className="h-4 w-4 mt-0.5 shrink-0"
                        style={{ color: SEVERITY_COLORS[alert.severity] }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground leading-snug">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={SEV_VARIANT[alert.severity] ?? "secondary"} className="text-[10px] h-4 px-1.5">
                            {alert.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatTime(alert.triggeredAt)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="shrink-0 h-7 gap-1 text-xs"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <Check className="h-3 w-3" /> Ack
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator className="mb-3" />

          {/* Event log */}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Event Log ({sorted.length})
          </p>
          {sorted.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events yet.</p>
          ) : (
            <div className="space-y-1.5">
              {sorted.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }}
                    />
                    <span className="text-muted-foreground shrink-0">{formatTime(alert.triggeredAt)}</span>
                    <span className="text-foreground/80 truncate">{alert.message}</span>
                  </div>
                  <span className={alert.acknowledged ? "text-muted-foreground shrink-0" : "text-foreground shrink-0"}>
                    {alert.acknowledged ? "Ack'd" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
