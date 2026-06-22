"use client";

import { useEffect, useRef } from "react";
import type { ServerMessage, Vehicle } from "@oiltrack/types";
import { useTelemetryStore } from "@/store/telemetryStore";

import { WS_URL, HTTP_URL } from "@/lib/config";

const MAX_BACKOFF_MS = 15000;
const INITIAL_BACKOFF_MS = 1000;

export function useWebSocketConnection() {
  const setVehicles = useTelemetryStore((s) => s.setVehicles);
  const ingestTelemetryBatch = useTelemetryStore((s) => s.ingestTelemetryBatch);
  const ingestDriverAlert = useTelemetryStore((s) => s.ingestDriverAlert);
  const ingestWeightUpdate = useTelemetryStore((s) => s.ingestWeightUpdate);
  const ingestPanicAlert = useTelemetryStore((s) => s.ingestPanicAlert);
  const clearPanicAlert = useTelemetryStore((s) => s.clearPanicAlert);
  const ingestLoadUpdate = useTelemetryStore((s) => s.ingestLoadUpdate);
  const setConnectionStatus = useTelemetryStore((s) => s.setConnectionStatus);

  const reconnectAttempt = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const closedByEffect = useRef(false);

  useEffect(() => {
    closedByEffect.current = false;

    const loadVehicles = (attempt = 1) =>
      fetch(`${HTTP_URL}/vehicles`)
        .then((res) => { if (!res.ok) throw new Error(res.statusText); return res.json(); })
        .then((vehicles: Record<string, Vehicle>) => setVehicles(vehicles))
        .catch((err) => {
          console.error(`Failed to load vehicle metadata (attempt ${attempt}):`, err);
          if (attempt < 5) setTimeout(() => loadVehicles(attempt + 1), 2000 * attempt);
        });
    loadVehicles();

    function connect() {
      setConnectionStatus("connecting");
      const socket = new WebSocket(WS_URL);
      socketRef.current = socket;

      socket.onopen = () => {
        reconnectAttempt.current = 0;
        setConnectionStatus("connected");
      };

      socket.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          if (message.type === "TELEMETRY_BATCH") {
            ingestTelemetryBatch(message.tick, message.frames);
          } else if (message.type === "DRIVER_ALERT") {
            ingestDriverAlert(message);
          } else if (message.type === "WEIGHT_UPDATE") {
            ingestWeightUpdate(message.vehicleId, message.cargoLitres);
          } else if (message.type === "PANIC_ALERT") {
            ingestPanicAlert(message);
          } else if (message.type === "PANIC_CANCELLED") {
            clearPanicAlert(message.vehicleId);
          } else if (message.type === "LOAD_UPDATE") {
            ingestLoadUpdate(message.vehicleId, message.entry);
          }
        } catch (err) {
          console.error("Failed to parse WS message:", err);
        }
      };

      socket.onclose = () => {
        if (closedByEffect.current) return;
        setConnectionStatus("disconnected");
        const delay = Math.min(
          INITIAL_BACKOFF_MS * 2 ** reconnectAttempt.current,
          MAX_BACKOFF_MS
        );
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      socket.onerror = () => { socket.close(); };
    }

    connect();

    return () => {
      closedByEffect.current = true;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      socketRef.current?.close();
    };
  }, [ingestDriverAlert, ingestTelemetryBatch, ingestWeightUpdate, ingestPanicAlert, clearPanicAlert, ingestLoadUpdate, setConnectionStatus, setVehicles]);
}
