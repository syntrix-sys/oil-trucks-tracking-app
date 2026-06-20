"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Fuel, Lock, User, AlertCircle, Truck, Shield, Zap } from "lucide-react";
import { login, DEMO_CREDENTIALS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CHIPS = [
  { icon: Zap,    label: "Real-time telemetry" },
  { icon: Shield, label: "8 tankers monitored" },
  { icon: Truck,  label: "Live GPS tracking" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    await new Promise((r) => setTimeout(r, 400));
    if (login(username, password)) {
      router.push("/");
    } else {
      setError("Invalid username or password.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #e8f5ed 0%, #f0f6f1 50%, #e5f0ea 100%)" }}>

      {/* Left branding */}
      <div className="hidden lg:flex lg:w-[44%] flex-col justify-between p-10 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-12 right-6 w-24 h-24 rounded-full opacity-35 pointer-events-none"
          style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.8) 0%, transparent 55%), #e5f5ed", border: "2px solid rgba(37,134,81,0.18)", boxShadow: "0 6px 0 rgba(28,100,64,0.16)" }} />
        <div className="absolute bottom-28 right-16 w-14 h-14 rounded-full opacity-25 pointer-events-none"
          style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.8) 0%, transparent 55%), #fef9c3", border: "2px solid rgba(234,179,8,0.20)", boxShadow: "0 4px 0 rgba(180,135,0,0.18)" }} />

        {/* Logo */}
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)", border: "2px solid #1b6438", boxShadow: "0 3px 0 #1b6438, 0 8px 20px oklch(0.517 0.125 152 / 0.25)" }}>
            <Fuel className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="font-black text-foreground text-sm leading-tight">OilTrack Pro</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] font-bold">Fleet Monitor</p>
          </div>
        </div>

        {/* Hero */}
        <div className="relative z-10 space-y-6">
          <div className="w-28 h-28 rounded-[1.75rem] flex items-center justify-center animate-bounce-in"
            style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.80) 0%, transparent 55%), #e5f5ed", border: "2.5px solid rgba(37,134,81,0.22)", boxShadow: "0 7px 0 rgba(28,100,64,0.25), 0 18px 40px rgba(37,134,81,0.13)" }}>
            <Truck className="w-12 h-12 text-primary" />
          </div>

          <div>
            <h1 className="text-3xl font-black text-foreground leading-[1.1] tracking-tight">
              Fleet Intelligence<br />
              <span className="text-primary">Made Visual</span>
            </h1>
            <p className="text-muted-foreground text-xs leading-relaxed mt-2 max-w-xs">
              Real-time monitoring of your entire tanker fleet — speed, cargo, temperature, and driver safety unified in one dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {CHIPS.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 w-fit rounded-xl px-3 py-2"
                style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.80) 0%, transparent 55%), #e5f5ed", border: "2px solid rgba(37,134,81,0.20)", boxShadow: "0 3px 0 rgba(28,100,64,0.20), 0 7px 16px rgba(37,134,81,0.08)" }}>
                <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)", border: "2px solid #1b6438", boxShadow: "0 2px 0 #1b6438" }}>
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-bold text-foreground/80">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground/50 relative z-10 font-medium">
          © 2024 OilTrack Pro · Secure Fleet Management
        </p>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-5 lg:p-10">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-6 lg:hidden">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(160deg, oklch(0.580 0.130 152) 0%, oklch(0.517 0.125 152) 100%)", border: "2px solid #1b6438", boxShadow: "0 3px 0 #1b6438" }}>
              <Fuel className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-black text-foreground text-sm">OilTrack Pro</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-bold">Fleet Monitor</p>
            </div>
          </div>

          {/* Form card */}
          <div className="p-6 rounded-2xl"
            style={{ background: "linear-gradient(145deg, #ffffff 0%, #f6faf7 100%)", border: "2px solid rgba(0,0,0,0.07)", boxShadow: "0 7px 0 rgba(0,0,0,0.09), 0 20px 48px rgba(0,0,0,0.08)" }}>
            <div className="mb-5">
              <h2 className="text-xl font-black text-foreground">Welcome back 👋</h2>
              <p className="text-xs text-muted-foreground mt-1 font-medium">Sign in with your dispatcher credentials.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-[10px] font-black text-foreground/60 uppercase tracking-[0.12em]">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder={DEMO_CREDENTIALS.username} className="pl-9" autoComplete="username" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[10px] font-black text-foreground/60 uppercase tracking-[0.12em]">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" className="pl-9" autoComplete="current-password" required />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs font-bold text-red-600 rounded-xl px-3 py-2"
                  style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.75) 0%, transparent 55%), #fef2f2", border: "2px solid rgba(239,68,68,0.25)", boxShadow: "0 2px 0 rgba(185,28,28,0.18)" }}>
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full mt-1" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in…
                  </span>
                ) : "Sign in to Dashboard"}
              </Button>

              <div className="rounded-xl px-3.5 py-2.5"
                style={{ background: "linear-gradient(145deg, rgba(255,255,255,0.75) 0%, transparent 55%), #e5f5ed", border: "2px solid rgba(37,134,81,0.20)", boxShadow: "0 2px 0 rgba(28,100,64,0.18)" }}>
                <p className="text-[9px] font-black uppercase tracking-[0.15em] text-primary/60 mb-1">Demo Credentials</p>
                <p className="font-mono text-xs font-bold text-foreground/80">
                  <span className="text-primary">{DEMO_CREDENTIALS.username}</span> / <span className="text-primary">{DEMO_CREDENTIALS.password}</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
