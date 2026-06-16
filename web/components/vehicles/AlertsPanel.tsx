"use client";

import { useState } from "react";
import { AlertTriangle, Check, Send } from "lucide-react";
import type { Alert, Vehicle } from "@oiltrack/types";
import { useTelemetryStore } from "@/store/telemetryStore";
import { SEVERITY_COLORS, formatTime } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">Active Alerts</CardTitle>
          <Button onClick={handleSendWarning} size="sm" className="gap-1.5">
            <Send className="h-3.5 w-3.5" /> Send Warning
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {toast && (
          <div className="text-xs bg-success/15 text-success border border-success/20 rounded-lg px-3 py-2">
            {toast}
          </div>
        )}

        <ScrollArea className="max-h-56">
          <div className="space-y-2">
            {active.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No active alerts.</p>
            )}
            {active.map((alert) => (
              <div key={alert.id} className="border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" style={{ color: SEVERITY_COLORS[alert.severity] }} />
                    <div className="min-w-0">
                      <p className="text-sm text-foreground">{alert.message}</p>
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
        </ScrollArea>

        <Separator />

        <div>
          <p className="text-sm font-semibold text-foreground mb-2">Event Log</p>
          <ScrollArea className="max-h-64">
            <div className="space-y-1.5">
              {sorted.length === 0 && <p className="text-xs text-muted-foreground">No events yet.</p>}
              {sorted.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: SEVERITY_COLORS[alert.severity] }} />
                    <span className="text-muted-foreground shrink-0">{formatTime(alert.triggeredAt)}</span>
                    <span className="text-foreground/80 truncate">{alert.message}</span>
                  </div>
                  <span className={alert.acknowledged ? "text-muted-foreground shrink-0" : "text-foreground shrink-0"}>
                    {alert.acknowledged ? "Ack'd" : "Open"}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
