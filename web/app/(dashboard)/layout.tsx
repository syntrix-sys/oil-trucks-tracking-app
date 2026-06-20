"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AlertToastProvider from "@/components/alerts/AlertToastProvider";
import CriticalAlertOverlay from "@/components/alerts/CriticalAlertOverlay";
import PanicAlertOverlay from "@/components/alerts/PanicAlertOverlay";
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
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #ffffff 0%, #f4f7f5 100%)",
              border: "2px solid rgba(0,0,0,0.07)",
              boxShadow: "0 4px 0 rgba(0,0,0,0.09), 0 12px 28px rgba(0,0,0,0.07)",
            }}>
            <div className="w-5 h-5 border-[2.5px] border-primary border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-xs font-bold text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex md:flex-col shrink-0 sticky top-0 h-screen overflow-y-auto"
        style={{
          width: "200px",
          borderRight: "2px solid rgba(0,0,0,0.06)",
          boxShadow: "3px 0 0 rgba(0,0,0,0.03), 6px 0 18px rgba(0,0,0,0.04)",
        }}>
        <Sidebar />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <Topbar />
        <main className="flex-1 p-3 md:p-4 animate-fade-in">{children}</main>
      </div>

      <AlertToastProvider />
      <CriticalAlertOverlay />
      <PanicAlertOverlay />
    </div>
  );
}
