# OilTrack Pro

A real-time oil truck fleet monitoring system. It consists of three parts that run together:

| Part | What it is | Who uses it |
|---|---|---|
| **Mock Server** | Simulates GPS, telemetry, and weight data for 8 trucks | Runs in the background — no one interacts with it directly |
| **Web Portal** | Dashboard in the browser for the dispatch office | Dispatcher / manager |
| **Mobile App** | Expo (React Native) app for the truck driver | Driver on their phone |

---

## Requirements

Before you begin, install these on your computer:

- [Node.js 20 or later](https://nodejs.org/) — includes `npm`
- [Git](https://git-scm.com/)
- [Expo Go](https://expo.dev/go) app installed on your **phone** (iOS or Android) — only needed for the mobile app

> **Windows users:** All commands below work in PowerShell or Command Prompt.

---

## Step 1 — Clone the repository

```bash
git clone https://github.com/KaarimHussain/oil-trucks-tracking-app.git
cd oil-trucks-tracking-app
```

---

## Step 2 — Install dependencies

Run this **once** from the root folder. It installs packages for the mock server, web portal, and shared types all at once.

```bash
npm install
```

---

## Step 3 — Set up environment files

### Web portal

Copy the example file and rename it:

```bash
# Windows (PowerShell)
Copy-Item web\.env.local.example web\.env.local

# macOS / Linux
cp web/.env.local.example web/.env.local
```

The default value (`ws://localhost:8080`) works out of the box for local development. You do not need to change anything.

---

### Mobile app

The mobile app is set up separately because it uses a different package manager configuration.

```bash
cd mobile
npm install --legacy-peer-deps
```

Then copy the example env file:

```bash
# Windows (PowerShell)
Copy-Item .env.example .env

# macOS / Linux
cp .env.example .env
```

Now open `mobile/.env` in any text editor and replace `192.168.x.x` with your **computer's local IP address**.

**How to find your local IP:**

- **Windows:** Open PowerShell and run `ipconfig`. Look for **IPv4 Address** under your Wi-Fi adapter. It will look like `192.168.1.45`.
- **macOS:** Open Terminal and run `ifconfig | grep "inet "`. Look for a line starting with `192.168.x.x`.
- **Android Emulator only:** Use `http://10.0.2.2:8080` — no IP lookup needed.

Your `.env` file should look like this when done:

```
EXPO_PUBLIC_SERVER_URL=http://192.168.1.45:8080
```

> **Important:** Your phone and your computer must be connected to the **same Wi-Fi network**, otherwise the mobile app will not reach the server.

Go back to the root folder when done:

```bash
cd ..
```

---

## Step 4 — Start everything

You need **three separate terminal windows** — one for each part. Open them side by side.

### Terminal 1 — Mock Server

```bash
npm run mock-server
```

You should see output like:

```
[MockServer] WebSocket server listening on ws://0.0.0.0:8080
[MockServer] HTTP server listening on http://0.0.0.0:8080
[MockServer] Tick 1 — broadcasting telemetry for 8 vehicles
```

Leave this running. It broadcasts live truck data every second.

---

### Terminal 2 — Web Portal

```bash
npm run web
```

Wait for the output:

```
▲ Next.js 14
- Local: http://localhost:3000
```

Then open your browser and go to: **http://localhost:3000**

**Web login credentials:**

| Field | Value |
|---|---|
| Username | `dispatcher` |
| Password | `oiltrack2024` |

---

### Terminal 3 — Mobile App

```bash
cd mobile
npm run start
```

A QR code will appear in the terminal.

1. Open **Expo Go** on your phone.
2. Tap **Scan QR Code** and scan the code shown in the terminal.
3. The app will load on your phone in about 30–60 seconds.

**Mobile login (CNIC):**

The app asks for a driver's CNIC number. Use any of the following:

| Driver Name | Vehicle | CNIC |
|---|---|---|
| Muhammad Usman | TRK-001 | `35202-1234567-9` |
| Ahmed Raza | TRK-002 | `42101-9876543-1` |
| Ali Hassan | TRK-003 | `36302-5678901-2` |
| Tariq Mahmood | TRK-004 | `61101-2345678-3` |
| Bilal Shahzad | TRK-005 | `42201-3456789-4` |
| Faisal Iqbal | TRK-006 | `35201-4567890-5` |
| Nadeem Khan | TRK-007 | `45501-5678901-6` |
| Zubair Ahmed | TRK-008 | `17301-6789012-7` |

Type the CNIC with or without dashes — the app formats it automatically.

---

## How the system works together

```
Mock Server (port 8080)
    │
    ├── WebSocket ──► Web Portal     (live telemetry updates every second)
    ├── WebSocket ──► Mobile App     (live telemetry for the driver's truck)
    └── REST API
          ├── GET  /vehicles         → loads vehicle + driver info on startup
          └── POST /vehicle/:id/weight → mobile syncs updated cargo litres
```

When a driver updates the cargo weight on the mobile app and taps **Sync**, the value is sent to the mock server, which broadcasts it to the web portal. The web dashboard then shows the updated cargo litres with a **Mobile** badge on that vehicle's card — in real time.

---

## Troubleshooting

### Web portal shows "Connecting…" and never connects

- Make sure the mock server (Terminal 1) is running.
- Check that `web/.env.local` contains `NEXT_PUBLIC_WS_URL=ws://localhost:8080`.
- Try refreshing the browser.

### Mobile app can't connect to the server

- Confirm your phone and computer are on the **same Wi-Fi network**.
- Double-check the IP address in `mobile/.env` — run `ipconfig` (Windows) or `ifconfig` (macOS) again to confirm it hasn't changed.
- Make sure the mock server is running (Terminal 1).
- If using an Android emulator (not a real phone), use `http://10.0.2.2:8080`.

### `npm install` fails in the mobile folder

Always use the `--legacy-peer-deps` flag for the mobile app:

```bash
cd mobile
npm install --legacy-peer-deps
```

### Expo Go shows a blank screen or "Something went wrong"

- Shake your phone while the app is open to open the developer menu, then tap **Reload**.
- If the error mentions "private properties", make sure `mobile/babel.config.js` has `unstable_transformProfile: 'default'` set inside the `babel-preset-expo` options.

### The QR code is not scannable

- In the Expo terminal, press `c` to clear and re-display the QR code.
- If scanning still fails, press `w` to open tunnel mode, then manually enter the URL shown in Expo Go under **Enter URL manually**.

---

## Project structure

```
oil-trucks-tracking-app/
├── packages/
│   └── types/          Shared TypeScript interfaces (Vehicle, Driver, alerts, etc.)
├── mock-server/        Node.js server — simulates truck telemetry via WebSocket + REST
├── web/                Next.js 14 web dashboard
│   ├── app/            Pages (dashboard, vehicles, alerts)
│   ├── components/     UI components (VehicleSummaryCard, gauges, etc.)
│   ├── store/          Zustand global state (telemetry, alerts, weight overrides)
│   └── lib/            Hooks (useWebSocket, useTelemetry) + formatters + auth
└── mobile/             Expo (React Native) driver app — standalone, not in workspaces
    ├── app/            Screens (splash, auth, orders, journey)
    ├── components/     EmergencyButton, BreakModal, TelemetryGauge
    ├── lib/            CNIC auth helpers, API client
    └── constants/      Mock delivery orders per vehicle
```

---

## Web portal pages

| Page | URL | Description |
|---|---|---|
| Dashboard | `/` | Live map + vehicle cards with real-time telemetry |
| Vehicles | `/vehicles` | Table of all 8 trucks with driver CNIC, chassis number, trip dates |
| Alerts | `/alerts` | Paginated alert log with filters, bulk acknowledge, CSV/PDF export |

---

## Mobile app screens

| Screen | Description |
|---|---|
| Splash | Animated logo — auto-redirects based on saved login session |
| Auth | CNIC login — type digits and dashes are added automatically |
| Orders | List of delivery orders assigned to your truck |
| Journey | Live GPS, speed gauge, fuel level, cargo weight sync, break timer, emergency call button |

---

## Optional: fast-forward mode

The mock server can run at 10× speed (200 ms per tick instead of 2 s), which is useful for quickly generating a large number of alerts to test the alerts page:

```bash
npm run mock-server:fast
```
