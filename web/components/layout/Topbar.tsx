"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, Siren, Wifi, WifiOff, Menu, Fuel } from "lucide-react";
import { logout, getCurrentUser } from "@/lib/auth";
import { useTelemetryStore } from "@/store/telemetryStore";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Sidebar from "./Sidebar";

export default function Topbar() {
  const router           = useRouter();
  const activeAlerts     = useTelemetryStore((s) => s.activeAlerts);
  const panicAlerts      = useTelemetryStore((s) => s.panicAlerts);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const [mobileOpen, setMobileOpen] = useState(false);

  const criticalCount = activeAlerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;
  const panicCount    = Object.keys(panicAlerts).length;
  const user          = getCurrentUser() ?? "User";
  const isConnected   = connectionStatus === "connected";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <TooltipProvider>
      <header
        className="h-12 flex items-center justify-between px-3 md:px-4 sticky top-0 z-30"
        style={{
          background: "linear-gradient(180deg, #f2f7f3 0%, #edf4ef 100%)",
          borderBottom: "2px solid rgba(0,0,0,0.06)",
          boxShadow: "0 3px 0 rgba(0,0,0,0.04), 0 8px 20px rgba(0,0,0,0.05)",
        }}
      >
        {/* Left */}
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="md:hidden">
                <Menu className="h-3.5 w-3.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-56 border-0"
              style={{ boxShadow: "6px 0 24px rgba(0,0,0,0.10)" }}>
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)",
                border: "2px solid #1b6438",
                boxShadow: "0 2px 0 #1b6438",
              }}>
              <Fuel className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-black text-foreground">OilTrack Pro</span>
          </div>

          {/* Desktop: connection pill */}
          <div className="hidden md:block">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={isConnected ? {
                background: "linear-gradient(145deg, rgba(255,255,255,0.75) 0%, transparent 55%), #e5f5ed",
                border: "2px solid rgba(37,134,81,0.28)",
                boxShadow: "0 2px 0 rgba(28,100,64,0.25)",
                color: "oklch(0.400 0.125 152)",
              } : {
                background: "linear-gradient(145deg, rgba(255,255,255,0.75) 0%, transparent 55%), #fef2f2",
                border: "2px solid rgba(239,68,68,0.25)",
                boxShadow: "0 2px 0 rgba(185,28,28,0.22)",
                color: "oklch(0.500 0.243 29.2)",
              }}
            >
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              <span className="hidden sm:inline capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          <div className={`md:hidden w-2 h-2 rounded-full ${isConnected ? "bg-primary animate-pulse" : "bg-red-500"}`} />

          {panicCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black animate-pulse"
              style={{
                background: "#fef2f2",
                border: "2px solid rgba(239,68,68,0.35)",
                boxShadow: "0 2px 0 rgba(185,28,28,0.30)",
                color: "#dc2626",
              }}>
              <Siren className="h-3 w-3" />
              {panicCount} SOS
            </div>
          )}

          {criticalCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-black animate-pulse-ring"
              style={{
                background: "#fff7ed",
                border: "2px solid rgba(249,115,22,0.35)",
                boxShadow: "0 2px 0 rgba(180,72,0,0.28)",
                color: "#ea580c",
              }}>
              <AlertTriangle className="h-3 w-3" />
              {criticalCount}
            </div>
          )}

          {/* User pill */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl ml-0.5"
            style={{
              background: "linear-gradient(145deg, #ffffff 0%, #f4f7f5 100%)",
              border: "2px solid rgba(0,0,0,0.08)",
              boxShadow: "0 3px 0 rgba(0,0,0,0.09), 0 7px 16px rgba(0,0,0,0.05)",
            }}>
            <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)",
                border: "1.5px solid #1b6438",
                boxShadow: "0 2px 0 #1b6438",
              }}>
              <span className="text-[9px] font-black text-white">{user.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs font-bold text-foreground/80 hidden sm:inline">{user}</span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon-sm" onClick={handleLogout}
                className="text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs font-bold clay border-0 bg-white text-foreground rounded-lg">
              Sign out
            </TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
