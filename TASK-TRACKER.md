# OilTrack Pro — Feature Task Tracker

**Created:** 2026-06-18  
**Status:** Planning

---

## Upcoming Features

| # | Feature | Status | Priority |
|---|---|---|---|
| 1 | Panic Button on Mobile | ✅ Done | High |
| 2 | Geo Location API Integration | ✅ Done | High |
| 3 | Load Management on Mobile | ✅ Done | Medium |
| 4 | Recovery Points (Driver Emergency Aid) | ✅ Done | High |

---

---

## Feature 1: Panic Button on Mobile

**Goal:** Allow a driver to trigger a high-priority SOS alert with a single tap. The alert must reach the web dispatcher dashboard in real time and trigger an unmissable visual/audio notification.

**Current state:** There is an existing `EmergencyButton` component (`mobile/components/EmergencyButton.tsx`) that only opens a phone dialer. It has no server communication, no web alert integration, and no panic state.

---

### Outline Plan

#### Phase 1 — Mobile Side

- [ ] **1.1 — Redesign `EmergencyButton` component**
  - Replace the current phone-dialer-only button with a hold-to-confirm SOS pattern (press and hold 3 seconds to prevent accidental triggers)
  - Show a countdown ring animation while holding
  - On confirm: enter "panic active" state with pulsing red UI
  - On cancel (release before 3s): reset without sending anything
  - File: `mobile/components/EmergencyButton.tsx`

- [ ] **1.2 — Add `sendPanicAlert()` API call**
  - New function in `mobile/lib/api.ts`
  - `POST /vehicle/:id/panic` with body `{ vehicleId, driverName, location: { lat, lng }, timestamp }`
  - Server responds with `{ ok: true, alertId }`
  - File: `mobile/lib/api.ts`

- [ ] **1.3 — Integrate into Journey screen**
  - Pass current GPS coordinates from the journey screen state into the panic button
  - Show a "SOS Active — Help is on the way" banner after confirmation
  - Allow driver to cancel/clear the panic state with a separate "Cancel SOS" button
  - File: `mobile/app/journey.tsx`

- [ ] **1.4 — Integrate into Orders screen**
  - The `EmergencyButton` is also visible on the Orders screen (compact mode)
  - Compact mode should still trigger the panic flow (with last known GPS or null location)
  - File: `mobile/app/orders.tsx`

#### Phase 2 — Mock Server Side

- [ ] **2.1 — Add `POST /vehicle/:id/panic` route**
  - Accept panic payload, store it in a `panicStates` Map
  - Broadcast a `PANIC_ALERT` WebSocket message to all connected clients
  - `{ type: "PANIC_ALERT", vehicleId, driverName, location, timestamp, alertId }`
  - File: `mock-server/src/index.ts`

- [ ] **2.2 — Add `POST /vehicle/:id/panic/cancel` route**
  - Clear panic state for that vehicle
  - Broadcast `PANIC_CANCELLED` WebSocket message
  - File: `mock-server/src/index.ts`

- [ ] **2.3 — Add `PANIC_ALERT` and `PANIC_CANCELLED` to shared types**
  - File: `packages/types/src/index.ts`

#### Phase 3 — Web Dashboard Side

- [ ] **3.1 — Handle `PANIC_ALERT` in `useWebSocket.ts`**
  - Route new message type to store
  - File: `web/lib/useWebSocket.ts`

- [ ] **3.2 — Add panic state to `telemetryStore.ts`**
  - `panicVehicles: Record<string, PanicAlert>` — keyed by vehicleId
  - Actions: `ingestPanicAlert()`, `clearPanicAlert()`
  - File: `web/store/telemetryStore.ts`

- [ ] **3.3 — Build `PanicAlertOverlay` component**
  - Full-screen red modal overlay (above `CriticalAlertOverlay`) that cannot be dismissed without explicitly acknowledging
  - Shows vehicle ID, driver name, GPS coordinates (with a map pin link), and timestamp
  - Plays browser audio alert (Web Audio API beep loop)
  - "Acknowledge & Dispatch Help" button clears the overlay and POSTs to `/vehicle/:id/panic/cancel`
  - File: `web/components/alerts/PanicAlertOverlay.tsx`

- [ ] **3.4 — Show panic badge in Topbar**
  - Flashing red badge with vehicle count if any panic is active
  - File: `web/components/layout/Topbar.tsx`

- [ ] **3.5 — Show panic status in FleetStatusTable and FleetMap**
  - Panic vehicles get a 🆘 icon and red row highlight in the table
  - Panic vehicle marker pulses red on the map
  - Files: `web/components/dashboard/FleetStatusTable.tsx`, `web/components/map/FleetMap.tsx`

---

---

## Feature 2: Geo Location API Integration

**Goal:** Replace bare lat/lng coordinate display with human-readable place names across both mobile and web. Add real-time reverse geocoding so drivers and dispatchers see "Karachi Port Terminal" instead of `24.8607, 67.0011`. Also harden geofence breach detection using a proper geocoding service.

**Current state:** The mobile Journey screen shows raw lat/lng coordinates. The web map shows vehicle markers with no location labels. The `GEOFENCE_BREACH` alert type exists in types but is never triggered by the mock server.

---

### Outline Plan

#### Phase 1 — Choose & Configure Geocoding API

- [ ] **1.1 — Select geocoding provider**
  - Use **OpenStreetMap Nominatim** (free, no API key required) for reverse geocoding
  - Endpoint: `https://nominatim.openstreetmap.org/reverse?lat=X&lon=Y&format=json`
  - Rate limit: 1 req/s — cache results to stay within limits

- [ ] **1.2 — Create shared geocoding utility**
  - `reverseGeocode(lat, lng): Promise<string>` — returns a short place label
  - In-memory LRU cache (last 100 results, rounded to 3 decimal places for cache hits)
  - File (web): `web/lib/geocoding.ts`
  - File (mobile): `mobile/lib/geocoding.ts`

#### Phase 2 — Mobile Side

- [ ] **2.1 — Display place name on Journey screen**
  - Below the lat/lng chips, add a `<Text>` showing the resolved place name
  - Reverse-geocode whenever GPS coordinates change (debounced 5s)
  - Show "Locating…" while resolving, fallback to coordinates if API fails
  - File: `mobile/app/journey.tsx`

- [ ] **2.2 — Show place name in panic payload**
  - Include the resolved `placeName` string in `POST /vehicle/:id/panic` body
  - So the web dispatcher sees a readable location in the panic overlay

#### Phase 3 — Web Side

- [ ] **3.1 — Reverse geocode vehicle positions on the map**
  - In `VehiclePopupCard`, resolve and display current place name on popup open
  - Cache per vehicleId + rounded coords to avoid redundant calls
  - File: `web/components/map/VehiclePopupCard.tsx`

- [ ] **3.2 — Show place name in `VehicleListSidebar`**
  - Add a small grey subtitle under each vehicle entry showing current resolved location
  - File: `web/components/map/VehicleListSidebar.tsx`

- [ ] **3.3 — Show place name in individual vehicle detail page**
  - Replace raw coordinates with place name in the telemetry summary card
  - File: `web/app/(dashboard)/vehicles/[id]/page.tsx`

#### Phase 4 — Geofence Breach Detection (Mock Server)

- [ ] **4.1 — Define geofence zones per route**
  - Each vehicle has allowed corridor (bounding box around its route waypoints + 5 km buffer)
  - Any telemetry frame where `location` falls outside the corridor triggers `GEOFENCE_BREACH`
  - File: `mock-server/src/alerts.ts`

- [ ] **4.2 — Integrate geofence check into `evaluateAlerts()`**
  - Add `vehicleLocation: LatLng` to `AlertInputs`
  - Compute distance to nearest route waypoint; if > 5 km, emit `GEOFENCE_BREACH` critical alert
  - File: `mock-server/src/alerts.ts`

---

---

## Feature 3: Load Management on Mobile

**Goal:** Give drivers a proper cargo load management screen — replacing the single cargo liters text input with a full load entry form, load history log, fill-level progress bar, and multi-compartment breakdown if the tanker has compartments. All entries sync to the server in real time.

**Current state:** The Journey screen has a single `<TextInput>` for cargo liters and a "Sync" button. There is no load history, no fill-level visualization, no compartment support, and no load documentation.

---

### Outline Plan

#### Phase 1 — Data Model & API

- [ ] **1.1 — Define `LoadEntry` type**
  - `{ id, vehicleId, timestamp, totalLiters, compartments?: CompartmentEntry[], note?, syncedAt? }`
  - `CompartmentEntry: { compartmentId, label, capacityLiters, loadedLiters }`
  - File: `packages/types/src/index.ts`

- [ ] **1.2 — Add `POST /vehicle/:id/load` route on mock server**
  - Accept a `LoadEntry`, store as the latest load record for that vehicle
  - Broadcast a `LOAD_UPDATE` WebSocket message to all clients
  - `{ type: "LOAD_UPDATE", vehicleId, loadEntry }`
  - File: `mock-server/src/index.ts`

- [ ] **1.3 — Add `GET /vehicle/:id/load/history` route**
  - Returns array of the last 20 load entries for a vehicle (in-memory)
  - File: `mock-server/src/index.ts`

- [ ] **1.4 — Add `sendLoadEntry()` and `fetchLoadHistory()` to mobile API**
  - File: `mobile/lib/api.ts`

#### Phase 2 — New `LoadManagementScreen` (Mobile)

- [ ] **2.1 — Create `LoadManagementScreen` component**
  - Accessible from Journey screen via a "Load Management" card/button
  - File: `mobile/components/LoadManagementScreen.tsx` (or new route `mobile/app/load.tsx`)

- [ ] **2.2 — Fill-level progress bar**
  - Large visual fill bar: loaded liters / tank capacity
  - Color-coded: green (<80%), amber (80–95%), red (>95%)
  - Shows exact liters and percentage below the bar

- [ ] **2.3 — Quick entry form**
  - Total liters input (numeric, with increment/decrement ±500 L buttons)
  - Optional note field (e.g. "Partial load — pump issue at source")
  - "Save & Sync" button → calls `sendLoadEntry()`, shows success/error toast

- [ ] **2.4 — Compartment breakdown (optional, per vehicle)**
  - If vehicle has multiple compartments (defined per tank capacity in constants), show one row per compartment
  - Each compartment has its own liters input
  - Total auto-sums from compartments

- [ ] **2.5 — Load history log**
  - Scrollable list of past `LoadEntry` records for the current trip
  - Shows timestamp, total liters, and note
  - Fetched from `GET /vehicle/:id/load/history` on screen open
  - New entries from the current session prepended at the top

- [ ] **2.6 — Integrate into Journey screen**
  - Replace the existing inline cargo card with a "Load: X L (Y%)" summary chip
  - Tapping the chip opens the `LoadManagementScreen`
  - File: `mobile/app/journey.tsx`

#### Phase 3 — Web Dashboard Side

- [ ] **3.1 — Handle `LOAD_UPDATE` in `useWebSocket.ts`**
  - Route to store
  - File: `web/lib/useWebSocket.ts`

- [ ] **3.2 — Add load state to `telemetryStore.ts`**
  - `loadEntries: Record<string, LoadEntry[]>` — keyed by vehicleId, latest-first
  - Action: `ingestLoadUpdate(vehicleId, loadEntry)`
  - File: `web/store/telemetryStore.ts`

- [ ] **3.3 — Show load history in vehicle detail page**
  - New "Load Log" tab on the individual vehicle page
  - Table of load entries: timestamp, liters, fill %, note, synced-from-mobile badge
  - File: `web/app/(dashboard)/vehicles/[id]/page.tsx`

- [ ] **3.4 — Update `KpiCards` with aggregate load stats**
  - Add a "Total Cargo" KPI: sum of latest `totalLiters` across all active vehicles
  - File: `web/components/dashboard/KpiCards.tsx`

---

---

## Implementation Order (Recommended)

```
Week 1
  ├── Feature 1: Panic Button (highest safety priority)
  │     ├── Day 1–2: Mobile EmergencyButton redesign + API call
  │     ├── Day 3:   Mock server panic routes + types
  │     └── Day 4–5: Web PanicAlertOverlay + store + map/table badges
  │
Week 2
  ├── Feature 2: Geo Location API
  │     ├── Day 1:   Geocoding utility + caching (shared)
  │     ├── Day 2:   Mobile Journey screen place names + panic payload
  │     ├── Day 3–4: Web map popup + sidebar + vehicle detail
  │     └── Day 5:   Mock server geofence breach detection
  │
Week 3
  ├── Feature 3: Load Management
  │     ├── Day 1:   Types + mock server routes
  │     ├── Day 2–3: Mobile LoadManagementScreen (fill bar + form + compartments)
  │     ├── Day 4:   Mobile load history + Journey integration
  │     └── Day 5:   Web store + vehicle detail load tab + KPI card
```

---

## Progress Legend

| Symbol | Meaning |
|---|---|
| 🔲 Planned | Not started |
| 🔄 In Progress | Work has begun |
| ✅ Done | Complete and tested |
| ❌ Blocked | Waiting on dependency |
