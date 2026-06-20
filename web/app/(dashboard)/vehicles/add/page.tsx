"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Truck, Weight, Route, CheckCircle,
  AlertCircle, Loader2, Hash, CalendarRange,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useTelemetry } from "@/lib/useTelemetry";

const SERVER = process.env.NEXT_PUBLIC_WS_URL?.replace(/^ws/, "http") ?? "http://localhost:8080";

const MAKES = ["Volvo","Mercedes-Benz","MAN","Scania","DAF","Isuzu","Hino","FAW","Shacman","Other"];
const WHEEL_OPTIONS = [6, 10, 12, 18, 22];

const EMPTY: Record<string, string> = {
  registrationNumber: "",
  chassisNumber: "",
  make: "",
  model: "",
  year: "",
  numberOfWheels: "18",
  tankCapacityLitres: "",
  emptyWeightKg: "",
  maxGrossWeightKg: "",
  maxSpeedKmh: "90",
  origin: "",
  destination: "",
  tripStartDate: "",
  tripEndDate: "",
  cnic: "",
};

function Field({
  label, required, hint, error, children,
}: { label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function AddVehiclePage() {
  const router = useRouter();
  const { refreshVehicles } = useTelemetry();
  const [form, setForm]           = useState({ ...EMPTY });
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [success, setSuccess]     = useState("");

  function set(key: string, value: string) {
    setErrors((e) => ({ ...e, [key]: "" }));
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.registrationNumber.trim()) e.registrationNumber = "Required";
    if (!form.make.trim())               e.make               = "Required";
    if (!form.model.trim())              e.model              = "Required";
    const yr = parseInt(form.year);
    if (!form.year || isNaN(yr) || yr < 1990 || yr > new Date().getFullYear() + 1)
                                         e.year               = "Enter a valid year (1990 – present)";
    const tank = parseFloat(form.tankCapacityLitres);
    if (!form.tankCapacityLitres || isNaN(tank) || tank <= 0)
                                         e.tankCapacityLitres = "Enter capacity in litres";
    const tare = parseFloat(form.emptyWeightKg);
    if (!form.emptyWeightKg || isNaN(tare) || tare <= 0)
                                         e.emptyWeightKg      = "Enter empty weight in kg";
    const gross = parseFloat(form.maxGrossWeightKg);
    if (!form.maxGrossWeightKg || isNaN(gross) || gross <= tare)
                                         e.maxGrossWeightKg   = "Must be greater than empty weight";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    setSuccess("");
    try {
      const res = await fetch(`${SERVER}/vehicles/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year:               parseInt(form.year),
          numberOfWheels:     parseInt(form.numberOfWheels) || undefined,
          tankCapacityLitres: parseFloat(form.tankCapacityLitres),
          emptyWeightKg:      parseFloat(form.emptyWeightKg),
          maxGrossWeightKg:   parseFloat(form.maxGrossWeightKg),
          maxSpeedKmh:        parseFloat(form.maxSpeedKmh) || 90,
          tripStartDate:      form.tripStartDate || undefined,
          tripEndDate:        form.tripEndDate   || undefined,
          chassisNumber:      form.chassisNumber || undefined,
          cnic:               form.cnic          || undefined,
          origin:             form.origin        || undefined,
          destination:        form.destination   || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error ?? "Registration failed");
        return;
      }
      setSuccess(`Vehicle ${data.vehicle.id} added successfully!`);
      await refreshVehicles();
      setTimeout(() => router.push("/vehicles"), 1200);
    } catch {
      setServerError("Could not reach server. Is the mock server running?");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/vehicles"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Add New Vehicle</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Register a tanker truck in the fleet</p>
        </div>
      </div>

      {/* Success / error banners */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-medium text-success">
          <CheckCircle className="h-4 w-4 shrink-0" />{success}
          <Badge variant="secondary" className="ml-auto animate-pulse">Redirecting…</Badge>
        </div>
      )}
      {serverError && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{serverError}
          <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => setServerError("")}>✕</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Vehicle Identity ── */}
        <Section icon={Truck} title="Vehicle Details">
          <Field label="Registration Number" required error={errors.registrationNumber}>
            <Input
              placeholder="e.g. LHE-4421"
              value={form.registrationNumber}
              onChange={(e) => set("registrationNumber", e.target.value.toUpperCase())}
              className="font-mono uppercase"
            />
          </Field>

          <Field label="Chassis Number" error={errors.chassisNumber}
            hint="17-character VIN (optional)">
            <Input
              placeholder="e.g. YV2R4HA23LA112233"
              value={form.chassisNumber}
              onChange={(e) => set("chassisNumber", e.target.value.toUpperCase())}
              className="font-mono"
              maxLength={17}
            />
          </Field>

          <Field label="Make / Brand" required error={errors.make}>
            <select
              className={cn(
                "w-full h-10 px-3 text-sm rounded-md border border-input bg-background",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                !form.make && "text-muted-foreground"
              )}
              value={form.make}
              onChange={(e) => set("make", e.target.value)}
            >
              <option value="">Select make…</option>
              {MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>

          <Field label="Model" required error={errors.model}>
            <Input
              placeholder="e.g. FH16, Actros 3348"
              value={form.model}
              onChange={(e) => set("model", e.target.value)}
            />
          </Field>

          <Field label="Year" required error={errors.year}>
            <Input
              type="number" placeholder="e.g. 2022"
              min={1990} max={new Date().getFullYear() + 1}
              value={form.year}
              onChange={(e) => set("year", e.target.value)}
            />
          </Field>

          <Field label="Number of Wheels">
            <div className="flex gap-2 flex-wrap">
              {WHEEL_OPTIONS.map((w) => (
                <button
                  key={w} type="button"
                  onClick={() => set("numberOfWheels", String(w))}
                  className={cn(
                    "px-4 py-1.5 rounded-lg border text-xs font-semibold transition-colors",
                    form.numberOfWheels === String(w)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input text-muted-foreground hover:border-primary/50"
                  )}
                >{w}</button>
              ))}
            </div>
          </Field>

          <Field label="Vehicle CNIC (owner's)" hint="Optional — for documentation" error={errors.cnic}>
            <Input
              placeholder="XXXXX-XXXXXXX-X"
              value={form.cnic}
              className="font-mono"
              maxLength={15}
              onChange={(e) => set("cnic", e.target.value)}
            />
          </Field>
        </Section>

        {/* ── Tank & Weight ── */}
        <Section icon={Weight} title="Tank & Weight Specifications">
          <Field label="Tank Capacity (litres)" required error={errors.tankCapacityLitres}
            hint="Total oil tank volume">
            <Input
              type="number" placeholder="e.g. 30000"
              min={1000} max={100000}
              value={form.tankCapacityLitres}
              onChange={(e) => set("tankCapacityLitres", e.target.value)}
            />
          </Field>

          <Field label="Empty Weight (kg)" required error={errors.emptyWeightKg}
            hint="Tare weight — vehicle without cargo">
            <Input
              type="number" placeholder="e.g. 12500"
              min={1000}
              value={form.emptyWeightKg}
              onChange={(e) => set("emptyWeightKg", e.target.value)}
            />
          </Field>

          <Field label="Max Gross Weight (kg)" required error={errors.maxGrossWeightKg}
            hint="Full load limit — must exceed empty weight">
            <Input
              type="number" placeholder="e.g. 40000"
              min={1000}
              value={form.maxGrossWeightKg}
              onChange={(e) => set("maxGrossWeightKg", e.target.value)}
            />
          </Field>

          <Field label="Max Speed (km/h)">
            <Input
              type="number" placeholder="90"
              min={40} max={140}
              value={form.maxSpeedKmh}
              onChange={(e) => set("maxSpeedKmh", e.target.value)}
            />
          </Field>
        </Section>

        {/* ── Route & Trip ── */}
        <Section icon={Route} title="Route & Trip">
          <Field label="Origin / Pickup Point">
            <Input
              placeholder="e.g. Karachi Port"
              value={form.origin}
              onChange={(e) => set("origin", e.target.value)}
            />
          </Field>

          <Field label="Destination / Drop-off">
            <Input
              placeholder="e.g. Hyderabad Bypass"
              value={form.destination}
              onChange={(e) => set("destination", e.target.value)}
            />
          </Field>

          <Field label="Trip Start Date">
            <Input
              type="date"
              value={form.tripStartDate}
              onChange={(e) => set("tripStartDate", e.target.value)}
            />
          </Field>

          <Field label="Trip End Date">
            <Input
              type="date"
              min={form.tripStartDate || undefined}
              value={form.tripEndDate}
              onChange={(e) => set("tripEndDate", e.target.value)}
            />
          </Field>
        </Section>

        {/* ── Submit ── */}
        <div className="flex items-center justify-end gap-3 pt-2 pb-8">
          <Button type="button" variant="outline" asChild>
            <Link href="/vehicles">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting || !!success} className="min-w-36">
            {submitting
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
              : <><Truck className="h-4 w-4" /> Add Vehicle</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
