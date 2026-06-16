"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Fuel, Lock, User, AlertCircle } from "lucide-react";
import { login, DEMO_CREDENTIALS } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative overflow-hidden">
      {/* Radial glow behind card */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
      </div>
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(to_right,var(--border)_1px,transparent_1px)] bg-[size:3rem_3rem] opacity-[0.12] pointer-events-none" />

      <div className="relative w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg glow-primary">
            <Fuel className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">OilTrack Pro</h1>
          <p className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">Tanker Fleet Monitoring</p>
        </div>

        <Card className="border-border/60 shadow-2xl bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sign in to Dashboard</CardTitle>
            <CardDescription className="text-xs">Enter your dispatcher credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="username" className="text-xs">Username</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={DEMO_CREDENTIALS.username}
                    className="pl-8 h-9 text-sm"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-8 h-9 text-sm"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full h-9 glow-primary" disabled={loading}>
                {loading
                  ? <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />Signing in…</span>
                  : "Sign in"
                }
              </Button>

              <div className="rounded border border-border/60 bg-secondary/40 px-3 py-2 text-[10px] text-muted-foreground">
                <span className="font-semibold text-foreground/70 uppercase tracking-wide text-[9px]">Demo credentials</span>
                <div className="mt-1 font-mono">
                  {DEMO_CREDENTIALS.username} / {DEMO_CREDENTIALS.password}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
