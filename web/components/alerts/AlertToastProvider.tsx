"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, X } from "lucide-react";
import { useTelemetryStore } from "@/store/telemetryStore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Toast {
  id: string;
  vehicleId: string;
  message: string;
}

export default function AlertToastProvider() {
  const activeAlerts = useTelemetryStore((s) => s.activeAlerts);
  const seenIds = useRef<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    const criticals = activeAlerts.filter((a) => a.severity === "critical");
    if (!initialized.current) {
      criticals.forEach((a) => seenIds.current.add(a.id));
      initialized.current = true;
      return;
    }
    const fresh = criticals.filter((a) => !seenIds.current.has(a.id));
    if (fresh.length === 0) return;
    fresh.forEach((a) => seenIds.current.add(a.id));
    setToasts((prev) => [...prev, ...fresh.map((a) => ({ id: a.id, vehicleId: a.vehicleId, message: a.message }))]);
    fresh.forEach((a) => setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== a.id)), 8000));
  }, [activeAlerts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-card border border-destructive/50 rounded-lg shadow-xl p-3 flex items-start gap-2 animate-slide-in-right"
        >
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold text-destructive">{toast.vehicleId}</span>
              <Badge variant="destructive" className="text-[10px] h-4 px-1.5">CRITICAL</Badge>
            </div>
            <p className="text-xs text-foreground/80 mt-0.5">{toast.message}</p>
            <Link href="/alerts" className="text-xs text-primary hover:underline mt-1 inline-block">
              View alerts →
            </Link>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 shrink-0 text-muted-foreground"
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
    </div>
  );
}
