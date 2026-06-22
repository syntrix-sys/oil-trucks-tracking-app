/**
 * Central config — all server URLs come from environment variables.
 * Set these in web/.env.local for local dev or in your deployment environment.
 */

export const WS_URL: string =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080";

// Derive HTTP base from WS_URL: ws → http, wss → https
export const HTTP_URL: string =
  process.env.NEXT_PUBLIC_HTTP_URL ??
  WS_URL.replace(/^wss/, "https").replace(/^ws(?!s)/, "http");

// OSRM road-routing server. Defaults to the free public demo instance.
// Self-host OSRM (https://github.com/Project-OSRM/osrm-backend) and set this
// to your own endpoint for production use.
export const OSRM_BASE: string =
  process.env.NEXT_PUBLIC_OSRM_URL ??
  "https://router.project-osrm.org/route/v1/driving";
