"use client";

import { useEffect, useRef } from "react";
import { AlertOctagon, Radio } from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { speedWeightRatio, ratioBand, THRESHOLDS } from "@oiltrack/types";
import { formatNumber } from "@/lib/formatters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const SIREN_HZ = 880;
const SIREN_INTERVAL_MS = 15000;
const SIREN_DURATION_MS = 900;

export default function CriticalAlertOverlay() {
  const driverAlerts = useTelemetryStore((s) => s.driverAlerts);
  const dismissDriverAlert = useTelemetryStore((s) => s.dismissDriverAlert);
  const vehicles = useTelemetryStore((s) => s.vehicles);
  const telemetry = useTelemetryStore((s) => s.telemetry);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const alert = driverAlerts[0];
  const vehicle = alert ? vehicles[alert.vehicleId] : null;
  const frame = alert ? telemetry[alert.vehicleId] : null;
  const ratio = frame ? speedWeightRatio(frame.speed.current, frame.weight.gross) : 0;

  useEffect(() => {
    if (!alert) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      return;
    }

    function playTone() {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = SIREN_HZ;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + SIREN_DURATION_MS / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + SIREN_DURATION_MS / 1000);
    }

    playTone();
    intervalRef.current = setInterval(playTone, SIREN_INTERVAL_MS);
    return () => { clearInterval(intervalRef.current!); intervalRef.current = null; };
  }, [alert]);

  // Auto-dismiss once ratio drops out of critical band
  useEffect(() => {
    if (!alert || !frame) return;
    if (ratioBand(speedWeightRatio(frame.speed.current, frame.weight.gross)) !== "critical") {
      dismissDriverAlert(alert.vehicleId);
    }
  }, [alert, frame, dismissDriverAlert]);

  return (
    <Dialog open={!!alert}>
      <DialogContent
        className="border-destructive/60 bg-card max-w-md mx-4 sm:mx-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-destructive/20 animate-pulse">
              <AlertOctagon className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <Badge variant="destructive" className="mb-1 gap-1">
                <Radio className="h-3 w-3" /> CRITICAL ALERT
              </Badge>
              <DialogTitle className="text-destructive text-lg">Speed / Weight Ratio Breach</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-foreground/80">{alert?.message}</DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: "Vehicle", value: vehicle?.id },
            { label: "Driver", value: vehicle?.driver.name },
            { label: "Current Speed", value: frame ? `${formatNumber(frame.speed.current, 0)} km/h` : "--" },
            { label: "Gross Weight", value: frame ? `${formatNumber(frame.weight.gross, 0)} kg` : "--" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-secondary/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="font-semibold text-foreground mt-0.5">{value ?? "--"}</p>
            </div>
          ))}

          <div className="col-span-2 bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Speed / Weight Ratio</p>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-destructive">{formatNumber(ratio, 2)}</span>
              <span className="text-xs text-muted-foreground">threshold &gt; {THRESHOLDS.ratio.critical}</span>
            </div>
          </div>
        </div>

        <Button
          variant="destructive"
          className="w-full mt-2"
          onClick={() => alert && dismissDriverAlert(alert.vehicleId)}
        >
          Acknowledge & Dismiss
        </Button>
      </DialogContent>
    </Dialog>
  );
}
