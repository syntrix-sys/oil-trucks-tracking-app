# OilTrack Pro

Tanker fleet monitoring system — desktop web portal (see `PROMPT.md` for the
full specification). Built as an npm-workspaces monorepo:

```
packages/types/   shared TypeScript domain types + alert thresholds
mock-server/      deterministic WebSocket telemetry replay server
web/              Next.js 14 dashboard (App Router + Tailwind + Mapbox GL)
mobile/           (not yet built — reserved for a future React Native app)
```

## Setup

```bash
npm install
```

No API keys needed — maps use **CartoDB GL styles** (free, no account required)
via **MapLibre GL JS** (open-source Mapbox fork).

## Generating the mock telemetry dataset

The mock server replays a pre-generated, deterministic 1-hour session
(1800 ticks × 8 vehicles, 2s/tick) from `mock-server/src/seed-data.json`.
It's already generated and checked in, but can be regenerated with:

```bash
npm run generate
```

## Running the demo

In one terminal, start the mock WebSocket server:

```bash
npm run mock-server          # real-time: 2s/tick, ~60 min session
npm run mock-server:fast      # fast-forward: 200ms/tick, ~6 min session
```

It serves:
- `ws://localhost:8080` — `TELEMETRY_BATCH` / `DRIVER_ALERT` messages
- `GET /vehicles` — static vehicle/driver/route metadata
- `GET /status` — current tick / elapsed / remaining time
- `POST /reset` — restart the session at tick 0

In another terminal, start the web app:

```bash
npm run web
```

Open http://localhost:3000 and sign in with the demo credentials shown on
the login screen (`dispatcher` / `oiltrack2024`).

## Demo script (scripted events)

The seeded session includes 13 scripted alert events across the 8 vehicles
(speeding, weight spikes, container/coolant overheating, low fuel, and two
critical Speed/Weight Ratio breaches with driver siren alerts for TRK-003 and
TRK-002). See `PROMPT.md` §3.2.3 for the full timeline.
