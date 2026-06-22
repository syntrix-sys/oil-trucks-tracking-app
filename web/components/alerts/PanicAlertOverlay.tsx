"use client";

import { useEffect, useRef } from "react";
import { Siren, MapPin, User, Clock, Phone } from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { HTTP_URL } from "@/lib/config";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDateTime } from "@/lib/formatters";

const BEEP_HZ = 1000;
const BEEP_INTERVAL_MS = 2000;
const BEEP_DURATION_MS = 400;

export default function PanicAlertOverlay() {
  const panicAlerts = useTelemetryStore((s) => s.panicAlerts);
  const clearPanicAlert = useTelemetryStore((s) => s.clearPanicAlert);
  const vehicles = useTelemetryStore((s) => s.vehicles);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show the oldest panic first (lowest timestamp)
  const entries = Object.values(panicAlerts).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const panic = entries[0] ?? null;
  const vehicle = panic ? vehicles[panic.vehicleId] : null;

  function playBeep() {
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctor();
      const ctx = audioCtxRef.current;

      // Double beep pattern
      [0, 0.25].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = BEEP_HZ;
        gain.gain.setValueAtTime(0.08, ctx.currentTime + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + BEEP_DURATION_MS / 1000);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + BEEP_DURATION_MS / 1000);
      });
    } catch {}
  }

  useEffect(() => {
    if (!panic) {
      clearInterval(intervalRef.current!);
      intervalRef.current = null;
      return;
    }
    playBeep();
    intervalRef.current = setInterval(playBeep, BEEP_INTERVAL_MS);
    return () => { clearInterval(intervalRef.current!); intervalRef.current = null; };
  }, [panic?.alertId]);

  async function handleAcknowledge() {
    if (!panic) return;
    // Tell server panic is cancelled (dispatcher acknowledged)
    try {
      await fetch(`${HTTP_URL}/vehicle/${panic.vehicleId}/panic/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: panic.alertId }),
      });
    } catch {}
    clearPanicAlert(panic.vehicleId);
  }

  return (
    <Dialog open={!!panic}>
      <DialogContent
        className="border-red-500/70 bg-card max-w-md mx-4 sm:mx-auto shadow-[0_0_60px_rgba(239,68,68,0.3)]"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-full bg-red-500/20 animate-pulse">
              <Siren className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <Badge className="mb-1 gap-1 bg-red-600 text-white hover:bg-red-600 border-0">
                <Siren className="h-3 w-3" /> DRIVER SOS
              </Badge>
              <DialogTitle className="text-red-500 text-lg">Panic Alert Received</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-foreground/80">
            A driver has triggered an emergency SOS. Immediate dispatcher action required.
          </DialogDescription>
        </DialogHeader>

        <Separator className="bg-red-500/20" />

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <User className="h-3 w-3" /> Driver
            </div>
            <p className="font-semibold text-foreground">{panic?.driverName ?? "—"}</p>
          </div>

          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Phone className="h-3 w-3" /> Vehicle
            </div>
            <p className="font-semibold text-primary">{panic?.vehicleId ?? "—"}</p>
            {vehicle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{vehicle.registrationNumber}</p>
            )}
          </div>

          <div className="col-span-2 bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" /> Triggered At
            </div>
            <p className="font-semibold text-foreground">{formatDateTime(panic?.timestamp ?? "")}</p>
          </div>

          {panic?.location && (
            <div className="col-span-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <MapPin className="h-3 w-3 text-red-400" /> Last Known Location
              </div>
              <p className="font-mono text-sm text-foreground">
                {panic.location.lat.toFixed(5)}, {panic.location.lng.toFixed(5)}
              </p>
              <a
                href={`https://www.google.com/maps?q=${panic.location.lat},${panic.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] text-blue-400 hover:underline mt-1 inline-block"
              >
                Open in Google Maps →
              </a>
            </div>
          )}

          {entries.length > 1 && (
            <div className="col-span-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
              <p className="text-xs text-orange-400 font-medium">
                +{entries.length - 1} more panic alert{entries.length > 2 ? "s" : ""} pending
              </p>
            </div>
          )}
        </div>

        <Button
          className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold"
          onClick={handleAcknowledge}
        >
          Acknowledge & Dispatch Help
        </Button>
      </DialogContent>
    </Dialog>
  );
}
