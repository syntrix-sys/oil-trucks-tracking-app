"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, Truck, Bell, FileBarChart, Settings, Fuel, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",         label: "Dashboard", icon: LayoutDashboard },
  { href: "/map",      label: "Fleet Map",  icon: Map },
  { href: "/vehicles", label: "Vehicles",   icon: Truck },
  { href: "/drivers",  label: "Drivers",    icon: Users },
  { href: "/alerts",   label: "Alerts",     icon: Bell },
  { href: "/reports",  label: "Reports",    icon: FileBarChart },
  { href: "/settings", label: "Settings",   icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full" style={{ background: "linear-gradient(180deg, #f0f5f1 0%, #eaf2ec 100%)" }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-12 shrink-0">
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)",
            border: "2px solid #1b6438",
            boxShadow: "0 3px 0 #1b6438, 0 7px 16px oklch(0.517 0.125 152 / 0.25)",
          }}>
          <Fuel className="w-3.5 h-3.5 text-white" />
        </div>
        <div>
          <p className="font-black text-foreground text-xs leading-tight">OilTrack Pro</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">Fleet Monitor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2.5 py-2 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[9px] font-black uppercase tracking-[0.15em] text-muted-foreground/50">
          Navigation
        </p>

        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "clay-nav-item flex items-center gap-2 px-2 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 border-2 border-transparent",
                active ? "clay-nav-active" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className={cn(
                "flex items-center justify-center w-6 h-6 rounded-lg shrink-0",
                active ? "bg-white/25" : "bg-white/70",
              )}>
                <Icon className={cn("w-3.5 h-3.5", active ? "text-white" : "text-muted-foreground")} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2.5 pb-3 shrink-0">
        <div className="rounded-xl px-3 py-2"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.7) 0%, transparent 55%), #e5f5ed",
            border: "2px solid rgba(37,134,81,0.22)",
            boxShadow: "0 2px 0 rgba(28,100,64,0.25), 0 6px 14px rgba(37,134,81,0.08)",
          }}>
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/60">Version</p>
          <p className="text-[10px] text-primary font-bold mt-0.5">v1.0 · Demo</p>
        </div>
      </div>
    </div>
  );
}
