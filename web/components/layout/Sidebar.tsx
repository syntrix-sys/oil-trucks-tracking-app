"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Map, Truck, Bell, FileBarChart, Settings, Fuel } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",        label: "Dashboard", icon: LayoutDashboard },
  { href: "/map",     label: "Fleet Map", icon: Map },
  { href: "/vehicles",label: "Vehicles",  icon: Truck },
  { href: "/alerts",  label: "Alerts",    icon: Bell },
  { href: "/reports", label: "Reports",   icon: FileBarChart },
  { href: "/settings",label: "Settings",  icon: Settings },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 h-12 border-b border-border/60 shrink-0">
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0 glow-primary">
          <Fuel className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-foreground text-xs leading-tight tracking-wide">OilTrack Pro</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Fleet Monitor</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 mb-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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
                "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-all duration-150 relative",
                active
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-l-2 border-primary pl-[9px]"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground border-l-2 border-transparent pl-[9px]"
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border/60 shrink-0">
        <p className="text-[9px] text-muted-foreground/50 uppercase tracking-widest">v1.0 · Demo</p>
      </div>
    </div>
  );
}
