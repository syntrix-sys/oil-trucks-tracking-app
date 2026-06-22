import { LatLng } from "@oiltrack/types";

/**
 * Major anchor waypoints per route — positioned on actual Pakistani highways.
 * The generator interpolates ~250m-spaced points between consecutive anchors.
 * These anchors follow the real road corridors to reduce off-road drift.
 */
export const ROUTE_ANCHORS: Record<string, LatLng[]> = {
  // TRK-001: Karachi Port → Hyderabad via M-9 Motorway / N-55 Superhighway
  "TRK-001": [
    { lat: 24.8607, lng: 67.0011 }, // Karachi Port
    { lat: 24.8950, lng: 67.0450 }, // Keamari / National Highway link
    { lat: 24.9400, lng: 67.1100 }, // Superhighway toll plaza
    { lat: 25.0200, lng: 67.2800 }, // Gadap / Superhighway km 30
    { lat: 25.1600, lng: 67.5200 }, // Jhimpir area
    { lat: 25.2800, lng: 67.8200 }, // Badin Road bypass
    { lat: 25.3500, lng: 68.1000 }, // Nooriabad / Kotri approach
    { lat: 25.3792, lng: 68.3683 }, // Hyderabad Bypass
  ],

  // TRK-002: Lahore Ring Road → Gujranwala via GT Road / N-5
  "TRK-002": [
    { lat: 31.5204, lng: 74.3587 }, // Lahore Ring Road north
    { lat: 31.5600, lng: 74.3200 }, // Shahdara Mori
    { lat: 31.6400, lng: 74.2700 }, // Muridke bypass
    { lat: 31.7300, lng: 74.2300 }, // Kamoke approach
    { lat: 31.8500, lng: 74.1800 }, // Gujranwala south outskirts
    { lat: 32.0836, lng: 74.1924 }, // Gujranwala Toll Plaza
  ],

  // TRK-003: Multan Bypass → Khanewal Junction via N-5
  "TRK-003": [
    { lat: 30.1575, lng: 71.5249 }, // Multan Bypass / N-5 junction
    { lat: 30.1100, lng: 71.6500 }, // Shujabad road
    { lat: 30.0800, lng: 71.8200 }, // Lodhran bypass
    { lat: 30.0650, lng: 71.9500 }, // Mian Channu outskirts
    { lat: 30.0500, lng: 72.0800 }, // Khanewal Junction
  ],

  // TRK-004: Rawalpindi Toll Plaza → Attock Bridge via GT Road / N-5
  "TRK-004": [
    { lat: 33.5651, lng: 73.0169 }, // Rawalpindi Toll Plaza
    { lat: 33.5900, lng: 72.9000 }, // Taxila bypass
    { lat: 33.6400, lng: 72.7800 }, // Hassan Abdal junction
    { lat: 33.7000, lng: 72.6200 }, // Wah Cantt / Hasan Abdal
    { lat: 33.7400, lng: 72.5000 }, // Campbellpur (Attock city)
    { lat: 33.7730, lng: 72.3597 }, // Attock Bridge
  ],

  // TRK-005: Karachi Superhighway → Nooriabad via M-9
  "TRK-005": [
    { lat: 24.9500, lng: 67.2000 }, // Superhighway km 12
    { lat: 25.0100, lng: 67.3000 }, // Gadap interchange
    { lat: 25.1200, lng: 67.5000 }, // Memon Goth area
    { lat: 25.2500, lng: 67.7800 }, // Jhimpir district
    { lat: 25.4500, lng: 68.0200 }, // Nooriabad approach
    { lat: 25.5800, lng: 68.1800 }, // Nooriabad
  ],

  // TRK-006: Lahore Thokar → Sahiwal via N-5 southern route
  "TRK-006": [
    { lat: 31.4300, lng: 74.2300 }, // Lahore Thokar Niaz Baig
    { lat: 31.3200, lng: 74.0500 }, // Renala Khurd bypass
    { lat: 31.2000, lng: 73.8000 }, // Chunian / Pattoki area
    { lat: 31.0800, lng: 73.5800 }, // Okara north
    { lat: 30.8100, lng: 73.4500 }, // Okara city bypass
    { lat: 30.6706, lng: 73.1068 }, // Sahiwal District entry
  ],

  // TRK-007: Sukkur Barrage → Shikarpur Bypass via N-55 north
  "TRK-007": [
    { lat: 27.7052, lng: 68.8574 }, // Sukkur Barrage
    { lat: 27.7300, lng: 68.7900 }, // Rohri bypass link
    { lat: 27.7800, lng: 68.7200 }, // Pano Aqil road
    { lat: 27.8500, lng: 68.6800 }, // Ghotki approach
    { lat: 27.9200, lng: 68.6500 }, // Shikarpur outskirts
    { lat: 27.9557, lng: 68.6375 }, // Shikarpur Bypass
  ],

  // TRK-008: Peshawar GT Road → Nowshera Interchange via GT Road / N-5
  "TRK-008": [
    { lat: 34.0151, lng: 71.5249 }, // Peshawar GT Road / Ring Road junction
    { lat: 33.9900, lng: 71.6500 }, // Pabbi / Kheshgi
    { lat: 34.0000, lng: 71.8200 }, // Nowshera approach
    { lat: 34.0100, lng: 71.9800 }, // Nowshera Interchange
  ],
};
