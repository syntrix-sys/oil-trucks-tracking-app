"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, LogOut, Wifi, WifiOff, Menu } from "lucide-react";
import { logout, getCurrentUser } from "@/lib/auth";
import { useTelemetryStore } from "@/store/telemetryStore";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Sidebar from "./Sidebar";

export default function Topbar() {
  const router = useRouter();
  const activeAlerts = useTelemetryStore((s) => s.activeAlerts);
  const connectionStatus = useTelemetryStore((s) => s.connectionStatus);
  const [mobileOpen, setMobileOpen] = useState(false);

  const criticalCount = activeAlerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;
  const user = getCurrentUser() ?? "User";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const isConnected = connectionStatus === "connected";

  return (
    <TooltipProvider>
      <header className="h-12 flex items-center justify-between px-3 border-b border-border/60 bg-background/95 backdrop-blur-xl sticky top-0 z-30">
        {/* Left */}
        <div className="flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-56 border-border/60">
              <Sidebar onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Connection pill */}
          <div className={`flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border ${
            isConnected
              ? "text-success border-success/30 bg-success/10"
              : "text-destructive border-destructive/30 bg-destructive/10"
          }`}>
            {isConnected
              ? <Wifi className="h-2.5 w-2.5" />
              : <WifiOff className="h-2.5 w-2.5" />
            }
            <span className="hidden sm:inline capitalize">{connectionStatus}</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1.5">
          {criticalCount > 0 && (
            <Badge variant="destructive" className="gap-1 text-[10px] h-6 animate-pulse-ring">
              <AlertTriangle className="h-2.5 w-2.5" />
              {criticalCount} Critical
            </Badge>
          )}

          <div className="flex items-center gap-1.5 pl-1.5 border-l border-border/60 ml-0.5">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-bold">
                {user.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-foreground/80 hidden sm:inline">{user}</span>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Sign out</TooltipContent>
          </Tooltip>
        </div>
      </header>
    </TooltipProvider>
  );
}
