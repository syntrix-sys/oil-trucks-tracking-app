"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AlertToastProvider from "@/components/alerts/AlertToastProvider";
import CriticalAlertOverlay from "@/components/alerts/CriticalAlertOverlay";
import { isAuthenticated } from "@/lib/auth";
import { useWebSocketConnection } from "@/lib/useWebSocket";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useWebSocketConnection();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:flex-col w-52 shrink-0 border-r border-border/60 sticky top-0 h-screen overflow-y-auto">
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-3 md:p-5 animate-fade-in">{children}</main>
      </div>

      <AlertToastProvider />
      <CriticalAlertOverlay />
    </div>
  );
}
