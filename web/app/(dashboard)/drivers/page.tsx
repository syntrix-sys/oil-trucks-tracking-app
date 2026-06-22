"use client";

import { useEffect, useState } from "react";
import { UserPlus, User, Truck, Phone, CreditCard, FileText, Home, ChevronRight, CheckCircle, AlertCircle, Loader2, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { HTTP_URL as SERVER } from "@/lib/config";

const VEHICLES = [
  "TRK-001","TRK-002","TRK-003","TRK-004",
  "TRK-005","TRK-006","TRK-007","TRK-008",
];

interface RegisteredDriver {
  id: string;
  cnicNumber: string;
  name: string;
  phone: string;
  licenseNumber: string;
  fatherName: string;
  permanentAddress: string;
  vehicleId: string;
  registeredAt: string;
}

const EMPTY_FORM = {
  name: "",
  cnicNumber: "",
  phone: "",
  licenseNumber: "",
  fatherName: "",
  permanentAddress: "",
  vehicleId: "",
};

function formatCnic(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 5)  return d;
  if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function isCnicValid(cnic: string) {
  return /^\d{5}-\d{7}-\d$/.test(cnic);
}

function formatTs(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-PK", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return iso; }
}

// ── Field wrapper ──────────────────────────────────────────────────────────
function Field({
  label, required, error, children,
}: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-foreground/80">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />{error}
        </p>
      )}
    </div>
  );
}

export default function DriversPage() {
  const [drivers, setDrivers]       = useState<RegisteredDriver[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [errors, setErrors]         = useState<Partial<typeof EMPTY_FORM>>({});
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => { loadDrivers(); }, []);

  async function loadDrivers() {
    setFetching(true);
    try {
      const res = await fetch(`${SERVER}/drivers`);
      if (res.ok) setDrivers(await res.json());
    } catch { /* server offline — show empty */ }
    finally { setFetching(false); }
  }

  function setField(key: keyof typeof EMPTY_FORM, value: string) {
    setErrors((e) => ({ ...e, [key]: "" }));
    if (key === "cnicNumber") {
      setForm((f) => ({ ...f, cnicNumber: formatCnic(value) }));
    } else {
      setForm((f) => ({ ...f, [key]: value }));
    }
  }

  function validate(): boolean {
    const e: Partial<typeof EMPTY_FORM> = {};
    if (!form.name.trim())          e.name          = "Full name is required";
    if (!isCnicValid(form.cnicNumber)) e.cnicNumber  = "Must be formatted XXXXX-XXXXXXX-X";
    if (!form.phone.trim())         e.phone         = "Phone number is required";
    if (!form.licenseNumber.trim()) e.licenseNumber = "License number is required";
    if (!form.vehicleId)            e.vehicleId     = "Please assign a vehicle";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setToast(null);
    try {
      const res = await fetch(`${SERVER}/drivers/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setToast({ type: "error", msg: data.error ?? "Registration failed" });
        return;
      }
      setToast({ type: "success", msg: `${form.name} registered successfully!` });
      setForm(EMPTY_FORM);
      setErrors({});
      setDrivers((prev) => [data.driver, ...prev]);
    } catch {
      setToast({ type: "error", msg: "Could not reach server. Is the mock server running?" });
    } finally {
      setSubmitting(false);
    }
  }

  const assignedVehicles = new Set(drivers.map((d) => d.vehicleId));
  const availableVehicles = VEHICLES.filter((v) => !assignedVehicles.has(v) || v === form.vehicleId);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Driver Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register drivers so they can sign in to the mobile app using their CNIC
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xl font-bold text-foreground tabular-nums">{drivers.length}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Registered</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium",
          toast.type === "success"
            ? "bg-success/10 border-success/30 text-success"
            : "bg-destructive/10 border-destructive/30 text-destructive"
        )}>
          {toast.type === "success"
            ? <CheckCircle className="h-4 w-4 shrink-0" />
            : <AlertCircle className="h-4 w-4 shrink-0" />}
          {toast.msg}
          <button className="ml-auto opacity-60 hover:opacity-100" onClick={() => setToast(null)}>✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* ── Registration Form ────────────────────────────────────────── */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserPlus className="h-3.5 w-3.5 text-primary" />
              </div>
              Register New Driver
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Name */}
              <Field label="Full Name" required error={errors.name}>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Muhammad Ali Khan"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                  />
                </div>
              </Field>

              {/* CNIC */}
              <Field label="CNIC Number" required error={errors.cnicNumber}>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-9 font-mono tracking-wider"
                    placeholder="XXXXX-XXXXXXX-X"
                    value={form.cnicNumber}
                    onChange={(e) => setField("cnicNumber", e.target.value)}
                    maxLength={15}
                  />
                  {isCnicValid(form.cnicNumber) && (
                    <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
                  )}
                </div>
              </Field>

              {/* Phone */}
              <Field label="Phone Number" required error={errors.phone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="+92-300-1234567"
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                  />
                </div>
              </Field>

              {/* License Number */}
              <Field label="License Number" required error={errors.licenseNumber}>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    className="pl-9 font-mono"
                    placeholder="PK-LHE-2020-001234"
                    value={form.licenseNumber}
                    onChange={(e) => setField("licenseNumber", e.target.value)}
                  />
                </div>
              </Field>

              {/* Father's Name */}
              <Field label="Father's Name" error={errors.fatherName}>
                <Input
                  placeholder="Abdul Rehman"
                  value={form.fatherName}
                  onChange={(e) => setField("fatherName", e.target.value)}
                />
              </Field>

              {/* Permanent Address */}
              <Field label="Permanent Address" error={errors.permanentAddress}>
                <div className="relative">
                  <Home className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground" />
                  <textarea
                    className={cn(
                      "w-full min-h-[72px] pl-9 pr-3 pt-2.5 pb-2 text-sm rounded-md border border-input bg-background",
                      "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                    )}
                    placeholder="House No, Street, City"
                    value={form.permanentAddress}
                    onChange={(e) => setField("permanentAddress", e.target.value)}
                  />
                </div>
              </Field>

              {/* Vehicle Assignment */}
              <Field label="Assign Vehicle" required error={errors.vehicleId}>
                <div className="relative">
                  <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <select
                    className={cn(
                      "w-full pl-9 pr-8 h-10 text-sm rounded-md border border-input bg-background",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      !form.vehicleId && "text-muted-foreground"
                    )}
                    value={form.vehicleId}
                    onChange={(e) => setField("vehicleId", e.target.value)}
                  >
                    <option value="">Select a vehicle…</option>
                    {VEHICLES.map((v) => {
                      const taken = assignedVehicles.has(v) && v !== form.vehicleId;
                      return (
                        <option key={v} value={v} disabled={taken}>
                          {v}{taken ? " (assigned)" : ""}
                        </option>
                      );
                    })}
                  </select>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground rotate-90 pointer-events-none" />
                </div>
              </Field>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering…</>
                  : <><UserPlus className="h-4 w-4" /> Register Driver</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Driver List ──────────────────────────────────────────────── */}
        <Card className="xl:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Registered Drivers</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs" onClick={loadDrivers} disabled={fetching}>
                {fetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {fetching ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading…</span>
              </div>
            ) : drivers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm font-medium text-foreground">No drivers registered yet</p>
                <p className="text-xs text-muted-foreground">Use the form to add your first driver.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {drivers.map((driver) => (
                  <div key={driver.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/40 transition-colors">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">
                        {driver.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-foreground">{driver.name}</span>
                        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0">{driver.vehicleId}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-muted-foreground font-mono tracking-wide">{driver.cnicNumber}</span>
                        <span className="text-[11px] text-muted-foreground">{driver.phone}</span>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-[10px] text-muted-foreground">{driver.licenseNumber}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">Registered {formatTs(driver.registeredAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
