import { LatLng } from "@oiltrack/types";

/**
 * Major anchor waypoints per route (§7.2). The generator interpolates
 * ~250-350 intermediate points at ~250m spacing between consecutive anchors.
 */
export const ROUTE_ANCHORS: Record<string, LatLng[]> = {
  "TRK-001": [
    { lat: 24.8607, lng: 67.0011 }, // Karachi Port
    { lat: 24.9200, lng: 67.1500 }, // Super Highway on-ramp
    { lat: 25.1200, lng: 67.4500 }, // Gadap Town
    { lat: 25.3700, lng: 67.8000 }, // Hub checkpoint
    { lat: 25.5500, lng: 68.1200 }, // Jhimpir area
    { lat: 25.3792, lng: 68.3683 }, // Hyderabad Bypass
  ],
  "TRK-002": [
    { lat: 31.5204, lng: 74.3587 }, // Lahore Ring Road
    { lat: 31.6200, lng: 74.2800 }, // Lahore northern exit
    { lat: 31.8500, lng: 74.1800 }, // Sheikhupura district
    { lat: 32.0836, lng: 74.1924 }, // Gujranwala Toll
  ],
  "TRK-003": [
    { lat: 30.1575, lng: 71.5249 }, // Multan Bypass
    { lat: 30.1200, lng: 71.8000 }, // Shujabad area
    { lat: 30.0700, lng: 71.9300 }, // Mian Channu approach
    { lat: 30.0500, lng: 72.0800 }, // Khanewal Junction
  ],
  "TRK-004": [
    { lat: 33.5651, lng: 73.0169 }, // Rawalpindi Toll Plaza
    { lat: 33.6200, lng: 72.8500 }, // Taxila bypass
    { lat: 33.7000, lng: 72.6500 }, // Wah Cantt
    { lat: 33.7730, lng: 72.3597 }, // Attock Bridge
  ],
  "TRK-005": [
    { lat: 24.9500, lng: 67.2000 }, // Karachi Superhighway start
    { lat: 25.1000, lng: 67.5500 }, // Memon Goth
    { lat: 25.3000, lng: 67.9500 }, // Jhimpir district
    { lat: 25.5800, lng: 68.1800 }, // Nooriabad
  ],
  "TRK-006": [
    { lat: 31.4300, lng: 74.2300 }, // Lahore Thokar
    { lat: 31.2000, lng: 73.8000 }, // Chunian area
    { lat: 30.9800, lng: 73.5500 }, // Okara district
    { lat: 30.6706, lng: 73.1068 }, // Sahiwal District
  ],
  "TRK-007": [
    { lat: 27.7052, lng: 68.8574 }, // Sukkur Barrage
    { lat: 27.7500, lng: 68.6800 }, // Rohri bypass
    { lat: 27.8000, lng: 68.5500 }, // Pano Aqil area
    { lat: 27.9557, lng: 68.6375 }, // Shikarpur Bypass
  ],
  "TRK-008": [
    { lat: 34.0151, lng: 71.5249 }, // Peshawar GT Road
    { lat: 34.0000, lng: 71.8000 }, // Pabbi area
    { lat: 34.0100, lng: 71.9800 }, // Nowshera Interchange
  ],
};
