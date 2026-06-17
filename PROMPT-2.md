# Prompt: Implement Oil Tanker Tracking Portal Updates & Driver Mobile App

## Role & Context
You are a senior full-stack developer and UI/UX expert. You are tasked with implementing updates to an existing **Oil Tanker Fleet Tracking System (OilTrack Pro)**. 

The project is structured as an npm-workspaces monorepo:
*   `packages/types/` — Shared TypeScript domain types and alert thresholds.
*   `mock-server/` — WebSocket telemetry replay server.
*   `web/` — Web Dashboard built with Next.js 14 (App Router, Tailwind CSS, MapLibre GL JS).
*   `mobile/` — A placeholder for the driver companion mobile app (to be built using React Native / Expo).

---

## Part 1: Web Portal Updates (`web/`)

Optimize the web dashboard to look professional, realistic, and production-ready. Avoid boilerplate/generic placeholder patterns.

### 1. Realistic Telemetry & Metrics
*   **Unique Statistics**: Ensure that metrics across different tankers are realistic and distinct.
    *   **Gross Weight**: Tanker weights must vary dynamically and reflect real load conditions; do not use identical numbers across different vehicles.
    *   **Speed**: Speeds should be varied and realistic (e.g., cruising speed vs. slow-moving/stopped), rather than static or identical.
    *   **Temperature & Pressure**: Each vehicle must report its own distinct, changing temperature and pressure values.
    *   **Trend Lines**: Sparklines and trend indicators must not show identical curves or flat lines. Make them dynamic, representing realistic fluctuations over time.

### 2. Fleet Overview & Reports Stats
*   In the reports and overview dashboards, ensure the statistics are consistent but distinct.
*   The counts for **Total Registered Vehicles**, **Online Vehicles**, and **Stopped Vehicles** must align logically (e.g., Online + Stopped $\le$ Total Registered) and must not display identical or generic placeholder numbers.

### 3. Fleet Table & Vehicle Details UI Updates
*   **Label Change**: Rename all UI labels and data properties referring to "Truck Number" to **Registration Number**.
*   **CNIC Integration**: Add the driver's/vehicle's associated **CNIC** (National Identity Card Number) to the vehicle detail cards and tables.
*   **Trip Date & End Date**: Add columns for **Trip Start Date** and **Trip End Date** to the main fleet table.
*   **Telemetry Sync**: Ensure the live liters weight value reported by the mobile app is accurately reflected in real-time in the web portal's vehicle detail card.

### 4. Real-time Alerts Log
*   **Run-time Updates**: The alerts log must update instantly on the run time as alerts are received via WebSockets.
*   **Date Formatting**: Format all alert timestamps to use the standard **`DD/MM/YYYY`** format (e.g., `17/06/2026`).

---

## Part 2: Mobile App for Drivers (`mobile/`)

Build a clean, high-usability driver-focused mobile companion application in the `mobile/` directory using React Native (Expo). The app must prioritize clear readability for truck drivers on the road.

### Core App Lifecycle & Permission
*   **Mandatory Location Services**: Upon app startup, the app must request location permissions. Location enablement is mandatory; show a clear blocking screen or prompt if denied.

### Screens Specification

#### **Screen 0: Splash Screen**
*   Show a beautifully animated splash screen upon application startup.
*   Display the **OilTrack Pro** logo prominently.

#### **Screen 00: CNIC Authentication**
*   **Login & Signup Flow**: Authentication must rely solely on the user's **CNIC number** (Format: `XXXXX-XXXXXXX-X`).
*   Simplify signup and sign-in processes using this single secure identifier.

#### **Screen 1: Delivery Order (DO) List**
*   After logging in, the driver lands on the Delivery Order (DO) List.
*   Each DO item shows destination, cargo details, and a **Start Trip** button.
*   **Single Active Trip Constraint**: The driver can only run **one active journey at a time**.
    *   Only one DO card should display an active "Start Trip" button.
    *   If a trip is already in progress, other DOs should have their start buttons disabled, or show a status indicating another trip is active.

#### **Screen 2: Active Journey Dashboard**
Once the driver clicks the "Start Trip" button, they transition to the active journey dashboard containing:
*   **Live Location Display**: Visual indicator of current GPS coordinates / simple route map.
*   **Weight Monitor (Liters)**: Real-time display of the tanker's load weight in liters. *Crucial: This value must synchronize back to the Web Portal's vehicle detail card.*
*   **Telemetry Gauges**:
    *   Current Temperature in tanker.
    *   Current Pressure in tanker.
*   **Break Manager**:
    *   Provide a prominent **Break** button.
    *   Clicking it triggers a popup modal asking for the **Break Reason** (dropdown or text field) and **Comments**.
    *   The modal must contain **Save** and **Cancel** buttons.
    *   Clicking **Save** halts/pauses the journey status, updates the system state, and replaces the "Stop/Pause" button on the screen with a "Start/Resume" button to resume the journey.

### Common Layout Elements
*   **Emergency Quick Action**: A persistent header or action bar must feature a **Call Emergency** button.
*   **Dialing Popup**: Clicking the button opens a dialer confirmation overlay. After a **5-second countdown**, the popup automatically closes to prevent blocking the screen.

---

## Part 3: Data Schema & Profiles

Ensure the following profiles are defined as shared TypeScript types (`packages/types/`) and implemented in both the web and mobile databases/interfaces:

### Vehicle Profile
```typescript
interface VehicleProfile {
  registrationNumber: string; // Formerly truck number
  chassisNumber: string;
  brand: string;
  model: string;
  maxWeightCapacityLiters: number;
  numberOfWheels: number;
  cnic: string; // Associated owner/vehicle CNIC
}
```

### Driver Profile
```typescript
interface DriverProfile {
  userName: string;
  fatherName: string;
  phoneNumber: string;
  cnicNumber: string;
  permanentAddress: string;
}
```

---

## Design and Aesthetic Requirements
1.  **Premium Aesthetics**: Build an interface that looks sleek and state-of-the-art. Avoid default browser elements, basic colors, or standard Tailwind defaults.
2.  **Typography & Layout**: Use custom typography (e.g., Inter, Outfit) with clean hierarchy.
3.  **Color Palette**: Use a cohesive, dark-themed or highly polished corporate identity (e.g., deep slate backgrounds, emerald for safe statuses, amber/red for warnings, vibrant blues for telemetry indicators).
4.  **Animations**: Incorporate smooth transitions and hover micro-animations to make the dashboard feel reactive and alive.