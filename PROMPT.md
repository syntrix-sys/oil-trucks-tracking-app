---
name: Oil Tanker Transport Tracker — Mobile App & Web Portal
description: >
  Complete specification and AI build prompt for a real-time oil tanker fleet
  tracking system with telemetry monitoring, alerts, and mock-data simulation.
  Covers a cross-platform mobile app (React Native) and a web portal (Next.js).
---

# OilTrack Pro — Tanker Fleet Monitoring System
### Full-Stack Build Prompt · Mobile App + Web Portal

---

## 1. Project Overview

Build **OilTrack Pro**, a full-stack fleet monitoring platform for oil transportation
via road tankers. The system must present **mock telemetry data that behaves like a
live, real-time feed** — suitable for client demonstrations without any physical
hardware. Every vehicle appears to move along a route, and its sensors stream
continuously changing values.

| Layer         | Technology                         |
|---------------|------------------------------------|
| Mobile App    | React Native (Expo) + TypeScript   |
| Web Portal    | Next.js 14 (App Router) + TypeScript |
| Map           | react-native-maps (mobile) / Mapbox GL JS or Google Maps JS API (web) |
| State / RT    | Zustand + a mock WebSocket engine  |
| Charts        | Victory Native (mobile) / Recharts (web) |
| Notifications | Expo Notifications (mobile) / Browser Push API (web) |
| Styling       | NativeWind (mobile) / Tailwind CSS (web) |
| Mock Backend  | Node.js + ws (WebSocket server with faker-generated data) |

---

## 2. Domain Entities

### 2.1 Vehicle

```typescript
interface Vehicle {
  id: string;                   // e.g. "TRK-001"
  registrationNumber: string;   // e.g. "ABC-1234"
  make: string;                 // e.g. "Mercedes-Benz"
  model: string;                // e.g. "Actros 3348"
  year: number;
  tankCapacityLitres: number;   // e.g. 30000
  emptyWeightKg: number;        // Tare weight, e.g. 12000
  maxGrossWeightKg: number;     // GVW limit, e.g. 38000
  maxSpeedKmh: number;          // Speed limit for this vehicle, e.g. 90
  driver: Driver;
  route: Route;
  status: "moving" | "idle" | "stopped" | "alert";
  imageUrl?: string;
}
```

### 2.2 Driver

```typescript
interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  phone: string;
  avatarUrl?: string;
  onDutySince: string;          // ISO timestamp
}
```

### 2.3 Route

```typescript
interface Route {
  id: string;
  name: string;                 // e.g. "Karachi → Lahore"
  waypoints: LatLng[];          // Array of { lat, lng }
  origin: string;
  destination: string;
  estimatedArrival: string;     // ISO timestamp
}
```

### 2.4 Telemetry (real-time frame, pushed every ~2 seconds)

```typescript
interface TelemetryFrame {
  vehicleId: string;
  timestamp: string;            // ISO timestamp
  location: {
    lat: number;
    lng: number;
    bearing: number;            // degrees, for map icon rotation
    altitude: number;           // metres
  };
  speed: {
    current: number;            // km/h
    average: number;            // km/h rolling 5-min average
    max: number;                // km/h session max
  };
  weight: {
    tare: number;               // kg — vehicle empty weight (constant)
    cargo: number;              // kg — current oil load
    gross: number;              // kg — tare + cargo
    percentFull: number;        // 0–100
  };
  temperature: {
    containerCelsius: number;   // oil temperature inside tank
    ambientCelsius: number;     // outside air temperature
    engineCoolantCelsius: number;
  };
  engine: {
    rpm: number;
    fuelLevelPercent: number;
    odometerKm: number;
    runningHours: number;
  };
  alerts: Alert[];              // active alerts for this frame
}
```

### 2.5 Alert

```typescript
interface Alert {
  id: string;
  vehicleId: string;
  type: AlertType;
  severity: "info" | "warning" | "critical";
  message: string;
  triggeredAt: string;          // ISO timestamp
  acknowledged: boolean;
}

type AlertType =
  | "SPEED_LIMIT_EXCEEDED"
  | "WEIGHT_LIMIT_EXCEEDED"
  | "SPEED_WEIGHT_RATIO_BREACH"   // Primary business rule — see §4
  | "HIGH_CONTAINER_TEMP"
  | "LOW_FUEL"
  | "ENGINE_OVERHEAT"
  | "GEOFENCE_BREACH"
  | "IDLE_TOO_LONG";
```

---

## 3. Mock Real-Time Engine (Shared Node.js Service)

### 3.1 Core Architecture — Pre-generated Dataset

**No loops. No randomness at runtime.**

The mock server uses a **build-once, replay-linearly** architecture:

1. A one-time **data generation script** (`scripts/generate.ts`) runs at build time
   and writes a fully deterministic, 1-hour dataset to `src/seed-data.json`.
2. At runtime the WebSocket server simply reads frames from that file in order and
   dispatches them on a 2-second timer — the exact same sequence every demo,
   with no possibility of the motion looking looped or repeating.
3. The dataset covers exactly **1,800 ticks × 8 vehicles = 14,400 frames** total,
   spanning T+00:00 to T+59:58 from the moment the server starts.
4. Frame timestamps are relative offsets (0, 2, 4, … 3598 seconds); the server
   rewrites them to wall-clock time on dispatch so they always look current.

### 3.2 Data Generation Script (`scripts/generate.ts`)

The generator must produce the following for each of the 8 vehicles:

#### 3.2.1 Route & Position Track

- Each route is defined by **major city-center waypoints** with real GPS
  coordinates (see §7 for the full coordinate table).
- Between consecutive major waypoints, the generator **interpolates 250–350
  intermediate GPS points** spaced ~250 m apart, giving a smooth, realistic path
  that covers 60–90 km of road over the 1-hour window at 60–90 km/h average.
- Bearing is computed from each consecutive lat/lng pair using the Haversine
  formula so the truck icon always faces the right direction.
- A **speed profile** is assigned per vehicle:
  - Segment 0–10 min: acceleration phase, speed ramps from 0 to cruise.
  - Segment 10–45 min: cruise phase with ±5 km/h random walk (Perlin-noise-seeded
    so the same sequence is always reproduced with the same seed).
  - Segment 45–55 min: traffic slow-down, speed drops to 20–35 km/h for 4–6 min.
  - Segment 55–60 min: resume cruise.
  - TRK-005 (Karachi→Hyderabad) gets a 3-minute full stop at T+28 min (fuel stop).

#### 3.2.2 Sensor Channels (all pre-generated, not runtime-random)

Use a **seeded PRNG** (e.g. `seedrandom` npm package, seed = vehicle ID string)
so reruns produce identical data:

| Channel | Generation Rule |
|---|---|
| Container temperature | Baseline 44 °C, slow drift via low-frequency sine wave (period 22 min), add ±1.2 °C high-freq noise. TRK-007 has a scripted spike to 63 °C at T+31 min lasting 4 min. |
| Ambient temperature | Fixed per route region (Karachi routes: 38 °C, Punjab routes: 33 °C, Balochistan routes: 29 °C) + ±0.3 °C noise. |
| Gross weight | Starts at vehicle's initial load (see §7); decreases monotonically at a rate of 0.4 kg per tick (≈ minor evaporation / meter drift simulation). Never increases. |
| Cargo % full | Derived from gross weight, never increases. |
| Engine RPM | Correlates with speed: idle 750, 0–30 km/h → 900–1400, 30–70 km/h → 1400–1900, >70 km/h → 1900–2300 + ±50 RPM noise. |
| Fuel level % | Starts at assigned level (see §7); decreases at 0.72 % per 10 ticks (~2.6 L/min equivalent at cruise). |
| Odometer | Accumulates from a per-vehicle starting value at the rate implied by speed. |
| Running hours | Starts from a per-vehicle value; increments 1/1800 of an hour per tick. |

#### 3.2.3 Scripted Alert Events (Baked into the Dataset)

These specific alert moments are **hard-coded into the generator** at exact tick
indices so they fire at predictable times during the demo:

| Time     | Vehicle  | Event                                              | What fires |
|----------|----------|----------------------------------------------------|------------|
| T+08:00  | TRK-003  | Speed raised to 96 km/h (over 90 limit)            | `SPEED_LIMIT_EXCEEDED` WARNING |
| T+12:30  | TRK-003  | Gross weight at 36,800 kg + speed 88 km/h → ratio 3.52 | `SPEED_WEIGHT_RATIO_BREACH` CRITICAL + `DRIVER_ALERT` event |
| T+14:00  | TRK-003  | Speed drops back to 72 km/h → ratio 2.84           | Alert auto-resolves, siren stops |
| T+19:45  | TRK-006  | Container temp spikes to 60 °C                     | `HIGH_CONTAINER_TEMP` WARNING |
| T+22:00  | TRK-006  | Container temp reaches 66 °C                       | `HIGH_CONTAINER_TEMP` CRITICAL |
| T+24:30  | TRK-006  | Temp back to 51 °C                                 | Alert resolves |
| T+31:00  | TRK-007  | Container temp spike (63 °C per §3.2.2)            | `HIGH_CONTAINER_TEMP` WARNING |
| T+35:00  | TRK-004  | Gross weight reaches 38,200 kg (over 38,000 limit) | `WEIGHT_LIMIT_EXCEEDED` CRITICAL |
| T+41:15  | TRK-001  | Fuel level hits 18 %                               | `LOW_FUEL` WARNING |
| T+47:00  | TRK-002  | Speed 94 km/h + weight 35,500 kg → ratio 3.61      | `SPEED_WEIGHT_RATIO_BREACH` CRITICAL + `DRIVER_ALERT` event |
| T+49:00  | TRK-002  | Speed reduced to 75 km/h                           | Alert resolves |
| T+55:00  | TRK-008  | Engine coolant reaches 98 °C                       | `ENGINE_OVERHEAT` WARNING |
| T+57:30  | TRK-005  | Fuel level hits 9 %                                | `LOW_FUEL` CRITICAL |

All frames between event start and resolution have the corresponding `Alert`
object embedded in the `alerts[]` array of the `TelemetryFrame`.

#### 3.2.4 Output Format

The generator writes:

```
mock-server/src/seed-data.json   ← ~12 MB, checked into repo
```

Structure:
```json
{
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "seed": "oiltrack-demo-v1",
  "tickIntervalSeconds": 2,
  "totalTicks": 1800,
  "vehicles": { "TRK-001": { ...vehicleStatic }, ... },
  "frames": [
    {
      "tick": 0,
      "offsetSeconds": 0,
      "data": {
        "TRK-001": { ...TelemetryFrame },
        "TRK-002": { ...TelemetryFrame },
        ...
      }
    },
    ...
  ]
}
```

### 3.3 Runtime WebSocket Server

The server:
1. Loads `seed-data.json` into memory on startup (one-time read).
2. Records `sessionStartTime = Date.now()`.
3. Every 2 seconds, advances a `currentTick` counter (0 → 1799, then **stops** —
   no loop, no wrap-around; after tick 1799 the server keeps the last frame
   frozen and logs "Demo session complete").
4. For each tick, takes the pre-computed frame block, rewrites every
   `timestamp` field to `new Date(sessionStartTime + tick * 2000).toISOString()`,
   then broadcasts to all connected clients as a single JSON message:
   ```json
   { "type": "TELEMETRY_BATCH", "tick": 42, "frames": { "TRK-001": {...}, ... } }
   ```
5. If a frame contains a `DRIVER_ALERT` event, additionally broadcasts a
   separate message on the same tick:
   ```json
   {
     "type": "DRIVER_ALERT",
     "vehicleId": "TRK-003",
     "alertType": "SPEED_WEIGHT_RATIO_BREACH",
     "audioCommand": "PLAY_SIREN",
     "message": "Warning! Speed/weight ratio exceeded. Reduce speed immediately."
   }
   ```
6. Exposes an HTTP endpoint `GET /status` (same port, via `http` upgrade) that
   returns `{ tick, totalTicks, elapsedSeconds, remainingSeconds }` — useful for
   the demo presenter to know how far into the session they are.
7. Exposes `POST /reset` to restart the tick counter to 0 without restarting the
   process — allows the demo to be replayed cleanly.

### 3.4 Mock Server File Structure

```
mock-server/
├── scripts/
│   └── generate.ts         ← Run once: npx ts-node scripts/generate.ts
├── src/
│   ├── index.ts            ← WebSocket server entry (replay engine)
│   ├── seed-data.json      ← Pre-generated 1-hour dataset (committed to repo)
│   ├── vehicles.ts         ← Static vehicle & driver data (8 vehicles)
│   ├── routes.ts           ← Route waypoint coordinate tables
│   ├── generator/
│   │   ├── positionTrack.ts  ← Waypoint interpolation & speed profiles
│   │   ├── sensorChannels.ts ← Seeded noise generation per channel
│   │   └── eventTimeline.ts  ← Scripted alert injection at fixed ticks
│   ├── alerts.ts           ← Alert rule evaluation (used by generator)
│   └── types.ts            ← Shared TypeScript types
├── package.json
└── tsconfig.json
```

---

## 4. Business Rules & Alert Thresholds

### 4.1 Speed / Weight Ratio Rule (Primary)

This is the **core safety feature** of the application.

```
ratio = currentSpeedKmh / grossWeightKg * 1000
```

| Ratio Band   | Action                                                             |
|--------------|--------------------------------------------------------------------|
| < 2.5        | Normal — green indicator                                           |
| 2.5 – 3.0    | Caution — yellow indicator, info alert logged                      |
| 3.0 – 3.5    | Warning — orange indicator, `WARNING` alert, driver notified       |
| > 3.5        | Critical — red indicator, `CRITICAL` alert, **siren triggered**    |

**Siren / Speaker Logic:**  
When ratio > 3.5, emit `DRIVER_ALERT` event. The mobile app (representing the
in-cab tablet) plays an audible siren using `expo-av` and displays a full-screen
red overlay with the warning message. The siren repeats every 15 seconds until
the ratio drops below 3.0 or the driver acknowledges via a button tap.

### 4.2 Other Thresholds

| Parameter              | Warning          | Critical        |
|------------------------|------------------|-----------------|
| Speed                  | > vehicle.maxSpeedKmh × 0.9 | > vehicle.maxSpeedKmh |
| Gross Weight           | > maxGrossWeightKg × 0.95   | > maxGrossWeightKg    |
| Container Temperature  | > 58 °C          | > 65 °C         |
| Engine Coolant Temp    | > 95 °C          | > 105 °C        |
| Fuel Level             | < 20 %           | < 10 %          |

---

## 5. Mobile Application (React Native / Expo)

### 5.1 Navigation Structure

```
App
├── (auth)/
│   └── login.tsx               ← Simple PIN/password login
└── (app)/
    ├── _layout.tsx             ← Bottom tab navigator
    ├── map/
    │   └── index.tsx           ← Live Map screen
    ├── vehicles/
    │   ├── index.tsx           ← Vehicle list screen
    │   └── [id]/
    │       ├── index.tsx       ← Vehicle detail + telemetry
    │       └── history.tsx     ← Historical charts
    ├── alerts/
    │   └── index.tsx           ← Alerts feed
    └── settings/
        └── index.tsx
```

### 5.2 Screen Specifications

#### Screen: Live Map (`map/index.tsx`)

- Full-screen map (react-native-maps, satellite or standard style toggle).
- Each active vehicle shown as a **custom animated marker**:
  - Tanker truck SVG icon rotated to match `location.bearing`.
  - Color-coded halo: green (normal) / yellow (caution) / orange (warning) / red (critical).
  - Subtle pulse animation on critical status.
- **Bottom sheet** (react-native-bottom-sheet) docked at 20 % height shows a
  scrollable fleet summary strip (vehicle ID + speed + status chip).
- Tapping a marker or fleet strip item **expands the bottom sheet to 60 %** and
  shows a compact **Telemetry Card** (see §5.3).
- Double-tap a marker to navigate to the full Vehicle Detail screen.
- Floating action button: "Center All Vehicles" — fits all markers in view.
- Real-time route polyline drawn behind each moving vehicle (last 5 minutes of
  track history, fading opacity).

#### Screen: Telemetry Card (Bottom Sheet Panel)

Displayed inside the map bottom sheet when a vehicle is selected.

```
┌─────────────────────────────────────────────┐
│  [Truck Icon]  TRK-003 · ABC-1234            │
│  Mercedes-Benz Actros 3348 · 2022            │
│  Driver: Ali Hassan  ·  On duty: 4h 23m      │
├─────────────────────────────────────────────┤
│  SPEED          WEIGHT (GROSS)   TEMP        │
│  72 km/h  🟡   36,400 kg  🔴    47 °C  🟢  │
│  ──────────     ───────────       ──────      │
│  Limit: 90      Limit: 38,000     Warn: 58   │
├─────────────────────────────────────────────┤
│  SPEED / WEIGHT RATIO                        │
│  ████████████░░░░  3.2  ⚠ WARNING           │
│  [Gauge from 0 to 5]                         │
├─────────────────────────────────────────────┤
│  Fuel: 68%  ████████████░░░░░░░░░░           │
│  RPM: 1820  Odometer: 142,308 km             │
└─────────────────────────────────────────────┘
```

#### Screen: Vehicle Detail (`vehicles/[id]/index.tsx`)

Full-screen detail with a tab bar at the top:

**Tab 1 — Live Telemetry**
- Large animated gauges (circular progress):  
  Speed | Gross Weight | Container Temp | Fuel Level
- Speed/Weight ratio meter (prominent, color-coded).
- Live values update every 2 s with a subtle number-increment animation.
- Active alerts section at the bottom (red cards, swipe to acknowledge).
- "Warn Driver" manual button — sends a manual `DRIVER_ALERT` event.

**Tab 2 — Vehicle Info**
- Vehicle photo / placeholder.
- Full specs table (make, model, year, registration, capacity, tare weight, GVW).
- Driver card (name, license, phone, shift duration).
- Current route progress (origin → destination, ETA, progress bar).

**Tab 3 — Charts (History)**
- Time-series line charts for the last 30 minutes of session:
  - Speed over time
  - Container temperature over time
  - Gross weight over time
  - Speed/Weight ratio over time (with threshold bands drawn as horizontal lines)
- Charts auto-scroll to show newest data on the right.

#### Screen: Alerts Feed (`alerts/index.tsx`)

- Chronological feed of all alerts across all vehicles.
- Filter chips: All | Critical | Warning | Info | Unacknowledged.
- Each alert card shows: vehicle ID, alert type badge, message, timestamp,
  acknowledge button.
- Critical alerts have a red left border and appear at the top even when sorted
  by time.
- Pull-to-refresh triggers re-connection to mock server.

#### Critical Alert Overlay (Modal, appears on top of any screen)

Triggered when `DRIVER_ALERT` event is received:

```
┌──────────────────────────────────────────┐
│  🚨  CRITICAL ALERT  🚨                  │
│                                          │
│  TRK-003 · Ali Hassan                    │
│                                          │
│  SPEED/WEIGHT RATIO BREACHED             │
│  Current Ratio: 3.8  (Limit: 3.5)        │
│                                          │
│  Reduce speed immediately!               │
│                                          │
│  Speed: 85 km/h   Gross: 37,200 kg       │
│                                          │
│        [ ACKNOWLEDGE ]                   │
└──────────────────────────────────────────┘
```

- Red pulsing background.
- Siren audio via `expo-av` (looping until acknowledged or ratio drops).
- Vibration via `expo-haptics`.

### 5.3 Mobile State Management (Zustand)

```typescript
// stores/telemetryStore.ts
interface TelemetryStore {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
  activeAlerts: Alert[];
  selectedVehicleId: string | null;
  connectionStatus: "connecting" | "connected" | "disconnected";

  // Actions
  connect: () => void;
  disconnect: () => void;
  selectVehicle: (id: string | null) => void;
  acknowledgeAlert: (alertId: string) => void;
}
```

---

## 6. Web Portal (Next.js 14)

### 6.1 Page Structure

```
app/
├── (auth)/
│   └── login/page.tsx
└── (dashboard)/
    ├── layout.tsx              ← Sidebar + top nav shell
    ├── page.tsx                ← Dashboard Home
    ├── map/page.tsx            ← Full fleet map
    ├── vehicles/
    │   ├── page.tsx            ← Fleet table
    │   └── [id]/page.tsx       ← Single vehicle deep-dive
    ├── alerts/page.tsx         ← Alert management
    ├── reports/page.tsx        ← Historical reports
    └── settings/page.tsx
```

### 6.2 Page Specifications

#### Dashboard Home (`/`)

A KPI summary page:

```
┌────────────────────────────────────────────────────────────────┐
│  OilTrack Pro                              🔴 3 Critical Alerts │
├──────────┬──────────┬──────────┬───────────────────────────────┤
│ VEHICLES │  MOVING  │  ALERTS  │  AVG SPEED                    │
│    8     │    6     │    3     │  67 km/h                      │
├──────────┴──────────┴──────────┴───────────────────────────────┤
│  [Mini Map — all vehicle positions, live]                       │
│  (click opens full map page)                                    │
├────────────────────────────────────────────────────────────────┤
│  Fleet Status Table (top 5 by alert severity)                  │
│  ID      │ Driver    │ Speed  │ Gross Wt │ Temp  │ Status      │
│  TRK-003 │ Ali H.    │ 85 k/h │ 37,200kg │ 47°C  │ ⚠ WARNING  │
│  ...                                                            │
├────────────────────────────────────────────────────────────────┤
│  [Speed/Weight Ratio Bar Chart — all 8 vehicles, live]         │
│  [Container Temperature Sparklines — all vehicles]             │
└────────────────────────────────────────────────────────────────┘
```

#### Full Fleet Map (`/map`)

- Mapbox GL JS or Google Maps embedded full-page.
- Same vehicle markers as mobile (truck SVG, color halo, bearing rotation).
- Left sidebar panel (collapsible) listing all vehicles with live status chips.
- Clicking a vehicle marker opens a **popup card** (similar to mobile telemetry card).
- "Satellite / Street" view toggle.
- Route polylines for all vehicles simultaneously.
- Top bar: global alert count badges, last-update timestamp.

#### Vehicle Detail (`/vehicles/[id]`)

Four-column layout on desktop:

**Column 1 — Vehicle Summary Card**
- Photo, registration, make/model/year.
- Driver info with avatar.
- Current route + ETA.

**Column 2 — Live Telemetry Gauges**
- Four semi-circular gauges: Speed, Gross Weight, Container Temp, Fuel.
- Speed/Weight Ratio — full-width horizontal gauge below.
- Values animate on update.

**Column 3 — Charts Panel**
- Recharts `<LineChart>` for each metric.
- Time window selector: 15 min / 30 min / 1 hr / Session.
- Download CSV button (generates CSV from in-memory history).

**Column 4 — Active Alerts & Event Log**
- Real-time alert feed for this vehicle.
- Acknowledge button per alert.
- "Send Warning to Driver" button (triggers `DRIVER_ALERT` event).
- Event log: timestamped history of all alerts (with type, severity, resolution time).

#### Alerts Management (`/alerts`)

- Table with sortable columns: Time | Vehicle | Type | Severity | Message | Status.
- Filter bar: date range picker, vehicle selector, severity multi-select.
- Bulk acknowledge.
- Export to PDF / CSV.
- Toast notification in top-right when a new critical alert arrives (even on other pages).

#### Reports (`/reports`)

- Pre-built report templates:
  1. Daily Fleet Summary — average speed, distance, alerts per vehicle.
  2. Temperature Log Report — container temp timeline per vehicle per day.
  3. Overweight Incidents Report — list of weight threshold breaches.
  4. Speed Violation Report.
- Date range selector.
- Charts (Recharts bar, area, pie).
- "Generate PDF" button (uses `jsPDF` + `html2canvas`).

### 6.3 Web Real-Time Connection

```typescript
// lib/useTelemetry.ts
// Custom React hook that connects to the mock WebSocket server,
// maintains a rolling 60-minute history per vehicle in memory,
// and exposes live frames + history arrays to components.

export function useTelemetry() {
  // Connect on mount, reconnect on disconnect with exponential back-off
  // Expose: vehicles, latestFrames, historyFrames, alerts, connectionStatus
}
```

---

## 7. Mock Data — Pre-configured Vehicles

### 7.1 Vehicle & Route Table

Each vehicle is assigned a **route segment** — a real stretch of Pakistani highway
long enough that at the vehicle's cruise speed it takes well over 1 hour to traverse,
so the dataset always shows forward motion with no risk of reaching the destination
during the demo.

| ID      | Registration | Make/Model                        | Route Segment (start → end)              | Route Distance | Cruise Speed | Driver          | Start Odometer | Initial Fuel % | Initial Load % |
|---------|-------------|-----------------------------------|------------------------------------------|----------------|--------------|-----------------|----------------|----------------|----------------|
| TRK-001 | LHE-4421    | Volvo FH16 · 2021                 | Karachi Port → Hyderabad Bypass          | 168 km         | 75 km/h      | Muhammad Usman  | 84,230 km      | 72 %           | 91 %           |
| TRK-002 | KHI-7732    | Mercedes-Benz Actros 3348 · 2022  | Lahore Ring Road → Gujranwala Toll       | 82 km          | 80 km/h      | Ahmed Raza      | 61,445 km      | 88 %           | 86 %           |
| TRK-003 | MUL-1198    | MAN TGX 26.540 · 2020             | Multan Bypass → Khanewal Junction        | 74 km          | 85 km/h      | Ali Hassan      | 112,780 km     | 65 %           | 94 %           |
| TRK-004 | ISB-3345    | DAF XF 530 · 2023                 | Rawalpindi Toll Plaza → Attock Bridge    | 93 km          | 78 km/h      | Tariq Mahmood   | 29,100 km      | 91 %           | 98 %           |
| TRK-005 | KHI-9901    | Scania R 500 · 2021               | Karachi Superhighway → Nooriabad         | 110 km         | 82 km/h      | Bilal Shahzad   | 75,560 km      | 55 %           | 83 %           |
| TRK-006 | LHE-6678    | Volvo FM 460 · 2022               | Lahore Thokar → Sahiwal District         | 140 km         | 76 km/h      | Faisal Iqbal    | 98,320 km      | 79 %           | 89 %           |
| TRK-007 | SUK-2234    | Mercedes-Benz Arocs · 2020        | Sukkur Barrage → Shikarpur Bypass        | 68 km          | 70 km/h      | Nadeem Khan     | 143,900 km     | 48 %           | 87 %           |
| TRK-008 | PES-8812    | MAN TGS 18.400 · 2019             | Peshawar GT Road → Nowshera Interchange  | 55 km          | 65 km/h      | Zubair Ahmed    | 187,450 km     | 61 %           | 80 %           |

**Route distance logic:** The shortest segment (TRK-008, 55 km at 65 km/h) takes
~50 minutes at cruise speed. With the traffic slow-down phase in the speed profile
(§3.2.1) the vehicle will not reach its endpoint within 60 minutes. All other
routes have more margin.

### 7.2 Route Waypoint Coordinate Tables

The generator uses these **major anchor waypoints**; it interpolates ~280 intermediate
points between each consecutive pair at ~250 m spacing:

```typescript
// routes.ts — anchor waypoints only (generator fills in the rest)
export const ROUTE_ANCHORS: Record<string, LatLng[]> = {
  "TRK-001": [
    { lat: 24.8607, lng: 67.0011 },  // Karachi Port
    { lat: 24.9200, lng: 67.1500 },  // Super Highway on-ramp
    { lat: 25.1200, lng: 67.4500 },  // Gadap Town
    { lat: 25.3700, lng: 67.8000 },  // Hub checkpoint
    { lat: 25.5500, lng: 68.1200 },  // Jhimpir area
    { lat: 25.3792, lng: 68.3683 },  // Hyderabad Bypass
  ],
  "TRK-002": [
    { lat: 31.5204, lng: 74.3587 },  // Lahore Ring Road
    { lat: 31.6200, lng: 74.2800 },  // Lahore northern exit
    { lat: 31.8500, lng: 74.1800 },  // Sheikhupura district
    { lat: 32.0836, lng: 74.1924 },  // Gujranwala Toll
  ],
  "TRK-003": [
    { lat: 30.1575, lng: 71.5249 },  // Multan Bypass
    { lat: 30.1200, lng: 71.8000 },  // Shujabad area
    { lat: 30.0700, lng: 71.9300 },  // Mian Channu approach
    { lat: 30.0500, lng: 72.0800 },  // Khanewal Junction
  ],
  "TRK-004": [
    { lat: 33.5651, lng: 73.0169 },  // Rawalpindi Toll Plaza
    { lat: 33.6200, lng: 72.8500 },  // Taxila bypass
    { lat: 33.7000, lng: 72.6500 },  // Wah Cantt
    { lat: 33.7730, lng: 72.3597 },  // Attock Bridge
  ],
  "TRK-005": [
    { lat: 24.9500, lng: 67.2000 },  // Karachi Superhighway start
    { lat: 25.1000, lng: 67.5500 },  // Memon Goth
    { lat: 25.3000, lng: 67.9500 },  // Jhimpir district
    { lat: 25.5800, lng: 68.1800 },  // Nooriabad
  ],
  "TRK-006": [
    { lat: 31.4300, lng: 74.2300 },  // Lahore Thokar
    { lat: 31.2000, lng: 73.8000 },  // Chunian area
    { lat: 30.9800, lng: 73.5500 },  // Okara district
    { lat: 30.6706, lng: 73.1068 },  // Sahiwal District
  ],
  "TRK-007": [
    { lat: 27.7052, lng: 68.8574 },  // Sukkur Barrage
    { lat: 27.7500, lng: 68.6800 },  // Rohri bypass
    { lat: 27.8000, lng: 68.5500 },  // Pano Aqil area
    { lat: 27.9557, lng: 68.6375 },  // Shikarpur Bypass
  ],
  "TRK-008": [
    { lat: 34.0151, lng: 71.5249 },  // Peshawar GT Road
    { lat: 34.0000, lng: 71.8000 },  // Pabbi area
    { lat: 34.0100, lng: 71.9800 },  // Nowshera Interchange
  ],
};
```

### 7.3 Demo Start Positions

Each vehicle starts at a **fixed tick-0 position** partway along its route so the
demo opens with all vehicles already spread across the map in motion — no vehicle
starts at its origin:

| Vehicle | Tick-0 Route Progress | Approximate Tick-0 Location         |
|---------|----------------------|-------------------------------------|
| TRK-001 | 22 % (37 km in)      | Near Gadap Town                     |
| TRK-002 | 35 % (29 km in)      | Approaching Sheikhupura             |
| TRK-003 | 18 % (13 km in)      | Just past Multan Bypass             |
| TRK-004 | 41 % (38 km in)      | Near Wah Cantt                      |
| TRK-005 | 28 % (31 km in)      | Memon Goth area                     |
| TRK-006 | 55 % (77 km in)      | Okara district                      |
| TRK-007 | 12 % (8 km in)       | Just past Rohri bypass              |
| TRK-008 | 48 % (26 km in)      | Pabbi area                          |

---

## 8. Folder Structure

```
oil-transport-tracker/
├── mobile/                     ← React Native (Expo) app
│   ├── app/
│   ├── components/
│   │   ├── map/
│   │   │   ├── VehicleMarker.tsx
│   │   │   ├── RoutePolyline.tsx
│   │   │   └── TelemetryBottomSheet.tsx
│   │   ├── telemetry/
│   │   │   ├── SpeedGauge.tsx
│   │   │   ├── WeightGauge.tsx
│   │   │   ├── TempGauge.tsx
│   │   │   ├── RatioMeter.tsx
│   │   │   └── TelemetryCard.tsx
│   │   ├── alerts/
│   │   │   ├── AlertCard.tsx
│   │   │   └── CriticalAlertOverlay.tsx
│   │   └── common/
│   ├── stores/
│   │   ├── telemetryStore.ts
│   │   └── alertStore.ts
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   └── useDriverAlert.ts   ← Siren + vibration logic
│   ├── constants/
│   │   └── thresholds.ts       ← All alert thresholds in one place
│   └── assets/
│       └── icons/
│           └── tanker.svg
│
├── web/                        ← Next.js web portal
│   ├── app/
│   ├── components/
│   │   ├── map/
│   │   ├── dashboard/
│   │   ├── charts/
│   │   ├── alerts/
│   │   └── ui/                 ← shadcn/ui components
│   ├── lib/
│   │   ├── useTelemetry.ts
│   │   ├── useWebSocket.ts
│   │   └── formatters.ts
│   └── public/
│
└── mock-server/                ← Shared mock WebSocket server
    ├── scripts/
    │   └── generate.ts         ← Run once to produce seed-data.json
    ├── src/
    │   ├── seed-data.json      ← Committed 1-hour dataset (~12 MB)
    │   ├── generator/
    │   │   ├── positionTrack.ts
    │   │   ├── sensorChannels.ts
    │   │   └── eventTimeline.ts
    │   └── ...
    └── package.json
```

---

## 9. UI / UX Design Language

### Color Palette

| Token          | Hex       | Usage                                  |
|----------------|-----------|----------------------------------------|
| `primary`      | `#1E3A5F` | Header, sidebar, primary buttons       |
| `accent`       | `#F4A01C` | Active elements, brand highlight       |
| `success`      | `#22C55E` | Normal / safe status                   |
| `warning`      | `#F59E0B` | Caution state                          |
| `danger`       | `#EF4444` | Critical alerts                        |
| `bg-dark`      | `#0F172A` | Dark mode background (web + mobile)    |
| `surface`      | `#1E293B` | Cards / panels                         |
| `text-primary` | `#F1F5F9` | Primary text (dark mode)               |

- Both apps use **dark mode by default** (professional industrial look).
- Map uses dark satellite style for night realism.

### Typography

- Mobile: `Inter` via Expo Google Fonts.
- Web: `Inter` via `next/font`.

### Micro-interactions

- All gauges animate smoothly (spring animation) when values change.
- Marker icons smoothly interpolate position on the map.
- Number counters increment/decrement digit by digit.
- Alert cards slide in from the right.

---

## 10. Implementation Steps (Recommended Order)

1. **Set up monorepo** with Turborepo or pnpm workspaces: `mobile/`, `web/`, `mock-server/`.
2. **Build shared types package** (`packages/types`) imported by all three packages.
3. **Write the data generator** (`mock-server/scripts/generate.ts`) and run it once
   to produce `seed-data.json`. Verify the file is ~12 MB and contains 1,800 tick
   blocks. Confirm scripted alert events appear at the correct tick indices.
4. **Build the replay WebSocket server** — load `seed-data.json`, dispatch on timer,
   expose `/status` and `/reset` endpoints. Test with `wscat` — watch timestamps
   advance and alert frames appear at expected times.
5. **Build mobile map screen** — get all 8 vehicles visible on map at their tick-0
   positions, icons pointing correct bearing.
6. **Add mobile telemetry bottom sheet + detail screen** — wire to live WebSocket frames.
7. **Implement siren/alert overlay on mobile** — test by watching for T+12:30 event.
8. **Build web portal** starting with map page, then dashboard, then detail/charts.
9. **Add web alert management + reports**.
10. **Polish animations and dark mode consistency**.
11. **Full demo rehearsal**: start server, open web portal + mobile simultaneously,
    watch the T+08:00, T+12:30, T+19:45, T+35:00 events fire in sequence. Hit
    `POST /reset` to restart cleanly for the actual client presentation.

---

## 11. Demo Script (For Client Presentation)

All events below fire **automatically** at the listed wall-clock offsets from the
moment the server starts. No manual triggering is needed \u2014 just narrate as they happen.

| Time into demo | What happens                                     | What to show on screen                                    |
|----------------|--------------------------------------------------|-----------------------------------------------------------|
| T+00:00        | Start server + open both apps                    | 8 trucks spread across Pakistan, all moving               |
| T+02:00        | Click **TRK-003** on web map                     | Live telemetry gauges animating, speed/weight ratio meter |
| T+08:00        | TRK-003 speed exceeds 90 km/h limit              | Warning chip turns orange on map marker; alert appears in feed |
| T+12:30        | TRK-003 ratio breaches 3.5 critical threshold    | **Red full-screen overlay on mobile, siren audio plays**; web shows CRITICAL badge |
| T+14:00        | TRK-003 driver slows down, ratio drops           | Siren stops, alert resolves \u2014 explain driver responded     |
| T+19:45        | TRK-006 container temperature rises to 60 \u00b0C     | Switch to TRK-006 detail; temperature gauge turns orange  |
| T+22:00        | TRK-006 temperature reaches 66 \u00b0C (critical)    | Gauge turns red; critical alert in feed                   |
| T+24:30        | TRK-006 temperature normalises                   | Gauge returns to green                                    |
| T+35:00        | TRK-004 gross weight exceeds 38,000 kg limit     | Show weight gauge at max; explain overload risk           |
| T+41:15        | TRK-001 fuel level at 18 %                       | Show fuel gauge low-warning on mobile                     |
| T+47:00        | TRK-002 ratio breaches 3.5                       | Second siren event \u2014 demonstrate multi-vehicle capability  |
| T+49:00        | TRK-002 resolves                                 | Navigate to **Alerts** page \u2014 show full incident log       |
| T+55:00        | TRK-008 engine overheat warning                  | Show engine coolant gauge; explain sensor variety         |
| T+57:30        | TRK-005 fuel critical                            | Navigate to **Reports** \u2014 show speed violation + temp log  |

**Closing:** Hit `POST /reset` (or refresh the server URL) to rewind to T+00:00
for a clean replay if the client wants to see any event again.

---

## 12. Environment Variables

```env
# mock-server/.env
WS_PORT=8080
TICK_INTERVAL_MS=2000          # 2000 = real-time; lower for fast-forward testing
SEED_FILE=src/seed-data.json   # path to pre-generated dataset
GENERATOR_SEED=oiltrack-demo-v1  # change to regenerate a different sequence

# mobile/.env (Expo)
EXPO_PUBLIC_WS_URL=ws://YOUR_LOCAL_IP:8080

# web/.env.local (Next.js)
NEXT_PUBLIC_WS_URL=ws://YOUR_LOCAL_IP:8080
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here   # or Google Maps key
```

> **Tip for rehearsal:** Set `TICK_INTERVAL_MS=200` (10× speed) to fast-forward
> through the full 1-hour dataset in 6 minutes and verify all scripted alert events
> fire correctly. Set back to `2000` before the actual demo.

---

## 13. Key NPM Packages

### mock-server
```json
{
  "dependencies": {
    "ws": "^8.17.0",
    "seedrandom": "^3.0.5"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "ts-node": "^10.9.0",
    "@types/seedrandom": "^3.0.8",
    "@types/ws": "^8.5.10"
  },
  "scripts": {
    "generate": "ts-node scripts/generate.ts",
    "start": "ts-node src/index.ts",
    "start:fast": "TICK_INTERVAL_MS=200 ts-node src/index.ts"
  }
}
```

> **Note:** `@faker-js/faker` is **not** used. All data is deterministic via
> `seedrandom` — this is intentional to guarantee identical output on every
> `npm run generate` invocation.

### mobile
```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-router": "~3.5.0",
    "react-native-maps": "~1.14.0",
    "@gorhom/bottom-sheet": "^4.6.0",
    "zustand": "^4.5.0",
    "expo-av": "~14.0.0",
    "expo-haptics": "~13.0.0",
    "victory-native": "^40.0.0",
    "nativewind": "^4.0.0",
    "@expo-google-fonts/inter": "^0.2.3",
    "react-native-reanimated": "~3.10.0",
    "react-native-gesture-handler": "~2.16.0"
  }
}
```

### web
```json
{
  "dependencies": {
    "next": "14.2.0",
    "react": "^18.3.0",
    "zustand": "^4.5.0",
    "recharts": "^2.12.0",
    "mapbox-gl": "^3.4.0",
    "react-map-gl": "^7.1.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "shadcn-ui": "latest",
    "jspdf": "^2.5.1",
    "html2canvas": "^1.4.1",
    "date-fns": "^3.6.0",
    "lucide-react": "^0.400.0"
  }
}
```

---

## 14. Security Notes

- The WebSocket server is **local/demo only** — no authentication is required for
  the mock, but note that production would require WSS + JWT bearer tokens.
- No real PII is used — all driver names and license numbers are fictional.
- No external API calls are made; all data is self-contained in the mock server.

---

## 15. 16-Hour Demo Build Plan

When the deadline is **16 hours**, the full spec must be scoped down to a
convincing demo. This section captures the agreed cuts, technology swaps,
hour-by-hour schedule, and priority order.

### 15.1 Mandatory Cuts

| Item | Decision | Rationale |
|---|---|---|
| Mobile app (React Native) | **Drop entirely** | Saves 5–6 hrs. Use Chrome DevTools mobile emulation for demo. |
| `seed-data.json` pre-generation script | **Drop** | Generate sensor values at runtime with `Math.sin()` — visually identical |
| `seedrandom` / Perlin noise | **Drop** | `Math.sin(tick * 0.05 + vehicleIndex)` is sufficient for demo |
| Reports page + PDF export | **Drop** | Not core to safety story |
| Authentication / login screen | **Drop** | Add a static user name in the top bar |
| CSV download | **Drop** | |
| Alerts management — filters & bulk actions | **Simplify** | Scrollable list only, no filter bar |
| Route polyline history trail | **Simplify** | Current marker position only |
| Recharts time window selector | **Simplify** | Fixed 30-min window |

### 15.2 Technology Swaps for Speed

| Original | Swap | Reason |
|---|---|---|
| Mapbox GL JS / Google Maps | **Leaflet.js + react-leaflet + OpenStreetMap** | Zero account setup, free, 5-min install |
| `react-map-gl` | **react-leaflet** | Simpler API |
| shadcn/ui full setup | **Tailwind + plain divs** | Avoid shadcn CLI init overhead |
| Circular gauge library | **CSS `conic-gradient`** | No library, renders correctly in all browsers |
| `jsPDF` / `html2canvas` | Dropped (Reports page dropped) | |

### 15.3 Runtime Mock Data (Replaces Generator Script)

Instead of the `scripts/generate.ts` pipeline, compute sensor values inline
on every tick using deterministic math:

```typescript
// Deterministic — same output every run, no seedrandom needed for demo purposes
const speed = cruiseSpeed + Math.sin(tick * 0.05 + vehicleIndex) * 5;
const containerTemp = 44 + Math.sin(tick * 0.015) * 3 + Math.sin(tick * 0.08) * 1.2;
const rpm = speed < 30 ? 900 + speed * 16 : speed < 70 ? 1400 + speed * 7 : 1900 + speed * 5;
const grossWeight = initialGrossKg - tick * 0.4;
const fuelLevel = initialFuel - (tick / 10) * 0.72;
```

Scripted alert events are still a hardcoded lookup table at exact tick indices
(see §3.2.3) — this part is unchanged.

**Browser siren** (no `expo-av` — web only):
```typescript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
osc.frequency.value = 880; // Hz
osc.connect(ctx.destination);
osc.start(); // call osc.stop() on acknowledge
```

### 15.4 Hour-by-Hour Schedule

| Hours | Task |
|---|---|
| 1–2 | pnpm monorepo init · Vehicle + route data in `vehicles.ts` · WebSocket server with runtime math telemetry |
| 3 | Hardcode scripted alert lookup table · Test with `wscat` · Verify T+12:30 DRIVER_ALERT fires |
| 4–5 | `create-next-app` · `react-leaflet` map · 8 moving markers with color-coded status halos |
| 6 | Dashboard home: 4 KPI cards + fleet status table + ratio bar chart |
| 7–8 | Vehicle detail page: CSS `conic-gradient` gauges + ratio bar + vehicle info panel |
| 9 | Critical alert full-screen overlay + Web Audio API siren + toast notifications |
| 10 | Alerts feed page (scrollable list, color-coded borders, acknowledge button) |
| 11 | Speed + temperature `LineChart` on vehicle detail (2 charts, fixed 30-min window) |
| 12 | Demo rehearsal — walk through §11 demo script end-to-end, fix broken items |
| 13 | Polish: dark mode consistency, marker positioning, animation smoothness |
| 14–15 | Buffer for unexpected issues |
| 16 | Feature freeze — no new code |

### 15.5 Priority Order (Stop When Time Runs Out)

1. ✅ Mock server broadcasting + map with moving markers → **minimum viable demo**
2. ✅ + Vehicle detail with gauges → **good demo**
3. ✅ + Critical alert overlay with siren → **great demo** ← the WOW moment
4. ✅ + Dashboard KPIs + alerts feed → **full demo**
5. Charts are optional — gauges alone tell the safety story

---

## 16. AI Tooling Recommendations

### Primary Tools by Task

| Task | Best Tool |
|---|---|
| Boilerplate scaffolding (pages, stores, hooks) | **GitHub Copilot Agent** or **Cursor Composer** |
| Interpolation math, bearing calculation | **Claude** (claude.ai or Claude Code) |
| CSS `conic-gradient` gauges | **ChatGPT-4o** or Copilot |
| Leaflet map integration + custom SVG markers | **Copilot** (large training corpus on Leaflet) |
| Recharts time-series with reference lines | **Copilot** |
| Web Audio API siren | **Claude** (stronger on less-common APIs) |
| Debugging WebSocket issues | **Claude** or ChatGPT with error pasted in |
| Dashboard / gauge visual layout | **v0.dev** → export → bring into project |
| GPS coordinate verification | Ask Claude/ChatGPT to confirm real Pakistani city coords |

### Cursor vs Claude Code

| | Cursor | Claude Code |
|---|---|---|
| Multi-file generation | ✅ Composer mode | ✅ Operates on whole codebase |
| Terminal (installs, runs server) | ❌ Manual | ✅ Runs commands autonomously |
| Reasoning quality (math/logic) | Good | Superior |
| Inline suggestions while typing | ✅ Best in class | ❌ CLI only |
| Cost model | Flat subscription | Usage-based |

**Recommended combination:**
- Use **Claude Code** for the heavy initial scaffolding runs (mock server, types, Zustand store)
- Use **Cursor** or **Copilot** for ongoing editing and refinement
- Use **v0.dev** to visually generate gauge and dashboard components, then wire with Copilot

### Using This Prompt File with AI Tools

Feed the relevant section directly to the AI as context:

```
"Read §3 of this spec and implement the mock WebSocket server in mock-server/src/"
"Read §7.2 and implement the ROUTE_ANCHORS data in routes.ts"
"Read §5.2 Telemetry Card and build the component using Tailwind dark mode classes"
```

Breaking the prompt into sections prevents context overflow and produces more
focused, accurate output than sending the entire file at once.

---

*End of Prompt — OilTrack Pro v1.0 Specification*
