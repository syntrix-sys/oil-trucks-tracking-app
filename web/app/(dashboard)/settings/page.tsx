"use client";

import { useState } from "react";
import { RotateCcw, Wifi, WifiOff } from "lucide-react";
import { THRESHOLDS } from "@oiltrack/types";
import { useTelemetry } from "@/lib/useTelemetry";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { WS_URL, HTTP_URL } from "@/lib/config";

export default function SettingsPage() {
  const { connectionStatus, currentTick } = useTelemetry();
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function handleReset() {
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch(`${HTTP_URL}/reset`, { method: "POST" });
      setResetMessage(res.ok ? "Demo session reset to tick 0." : "Failed to reset session.");
    } catch {
      setResetMessage("Could not reach mock server.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Signed in as</span>
            <span className="text-foreground text-right font-medium">{getCurrentUser() ?? "—"}</span>
            <span className="text-muted-foreground">Role</span>
            <span className="text-foreground text-right font-medium">Dispatcher</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Connection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <span className="text-muted-foreground">Mock server</span>
            <span className="text-foreground text-right font-mono text-xs">{WS_URL}</span>

            <span className="text-muted-foreground">Status</span>
            <div className="flex items-center justify-end gap-2">
              {connectionStatus === "connected" ? (
                <>
                  <Wifi className="h-3.5 w-3.5 text-success" />
                  <Badge variant="success" className="text-xs">Connected</Badge>
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5 text-destructive" />
                  <Badge variant="destructive" className="text-xs capitalize">{connectionStatus}</Badge>
                </>
              )}
            </div>

            <span className="text-muted-foreground">Current tick</span>
            <span className="text-foreground text-right font-mono">{currentTick}</span>

            <span className="text-muted-foreground">Map provider</span>
            <span className="text-foreground text-right text-xs">CartoDB (free, no API key)</span>
          </div>

          <Separator />

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={resetting}
              className="gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Demo Session
            </Button>
            {resetMessage && (
              <p className="text-xs text-muted-foreground">{resetMessage}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Alert Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0 divide-y divide-border text-sm">
            {[
              {
                label: "Container Temperature",
                value: `> ${THRESHOLDS.containerTemp.warning}°C warning, > ${THRESHOLDS.containerTemp.critical}°C critical`,
              },
              {
                label: "Engine Coolant Temp",
                value: `> ${THRESHOLDS.engineCoolantTemp.warning}°C warning, > ${THRESHOLDS.engineCoolantTemp.critical}°C critical`,
              },
              {
                label: "Fuel Level",
                value: `< ${THRESHOLDS.fuelLevel.warning}% warning, < ${THRESHOLDS.fuelLevel.critical}% critical`,
              },
              {
                label: "Speed / Weight Ratio",
                value: `> ${THRESHOLDS.ratio.caution} caution, > ${THRESHOLDS.ratio.warning} warning, > ${THRESHOLDS.ratio.critical} critical`,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 gap-4">
                <span className="text-muted-foreground">{label}</span>
                <span className="text-foreground text-right text-xs">{value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
