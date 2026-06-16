"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { STATUS_COLORS } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import VehiclePopupCard from "./VehiclePopupCard";

// Free CartoDB GL styles — no API key required.
export const MAP_STYLES = {
  streets: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
};

interface FleetMapProps {
  vehicles: Record<string, Vehicle>;
  telemetry: Record<string, TelemetryFrame>;
  mapStyle?: string;
  showRoutes?: boolean;
  selectedVehicleId?: string | null;
  onSelectVehicle?: (id: string | null) => void;
  interactive?: boolean;
  className?: string;
}

export default function FleetMap({
  vehicles,
  telemetry,
  mapStyle = MAP_STYLES.streets,
  showRoutes = false,
  selectedVehicleId,
  onSelectVehicle,
  interactive = true,
  className,
}: FleetMapProps) {
  const [popupVehicleId, setPopupVehicleId] = useState<string | null>(null);

  const vehicleList = useMemo(() => Object.values(vehicles), [vehicles]);

  const initialViewState = useMemo(() => {
    const first = vehicleList[0];
    const frame = first ? telemetry[first.id] : undefined;
    return {
      longitude: frame?.location.lng ?? 73.0,
      latitude: frame?.location.lat ?? 30.0,
      zoom: 6,
    };
  }, [vehicleList, telemetry]);

  const popupVehicle = popupVehicleId ? vehicles[popupVehicleId] : null;
  const popupFrame = popupVehicleId ? telemetry[popupVehicleId] : null;

  return (
    <Map
      initialViewState={initialViewState}
      mapStyle={mapStyle}
      style={{ width: "100%", height: "100%", borderRadius: "0.75rem" }}
      scrollZoom={interactive}
      dragPan={interactive}
      dragRotate={interactive}
      doubleClickZoom={interactive}
      touchZoomRotate={interactive}
    >
      {interactive && <NavigationControl position="top-right" />}

      {showRoutes &&
        vehicleList.map((vehicle) => {
          const coords = vehicle.route.waypoints.map((w) => [w.lng, w.lat]);
          return (
            <Source
              key={`route-${vehicle.id}`}
              id={`route-${vehicle.id}`}
              type="geojson"
              data={{
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: coords },
              }}
            >
              <Layer
                id={`route-line-${vehicle.id}`}
                type="line"
                paint={{
                  "line-color": "#3B82F6",
                  "line-width": 2,
                  "line-opacity": 0.4,
                  "line-dasharray": [2, 2],
                }}
              />
            </Source>
          );
        })}

      {vehicleList.map((vehicle) => {
        const frame = telemetry[vehicle.id];
        if (!frame) return null;
        const status = deriveVehicleStatus(frame);
        const color = STATUS_COLORS[status];
        const isSelected = selectedVehicleId === vehicle.id;

        return (
          <Marker
            key={vehicle.id}
            longitude={frame.location.lng}
            latitude={frame.location.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setPopupVehicleId(vehicle.id);
              onSelectVehicle?.(vehicle.id);
            }}
          >
            <div
              className="relative flex items-center justify-center cursor-pointer"
              style={{ width: 36, height: 36 }}
              title={vehicle.id}
            >
              <div
                className={`absolute inset-0 rounded-full ${status === "alert" ? "animate-pulse-ring" : ""}`}
                style={{
                  backgroundColor: color,
                  opacity: 0.25,
                  transform: isSelected ? "scale(1.4)" : "scale(1)",
                }}
              />
              <img
                src="/icons/tanker.svg"
                alt={vehicle.id}
                width={22}
                height={22}
                style={{
                  transform: `rotate(${frame.location.bearing}deg)`,
                  color,
                  filter: isSelected ? "drop-shadow(0 0 4px white)" : undefined,
                }}
              />
            </div>
          </Marker>
        );
      })}

      {popupVehicle && popupFrame && (
        <Popup
          longitude={popupFrame.location.lng}
          latitude={popupFrame.location.lat}
          anchor="bottom"
          offset={20}
          closeOnClick={false}
          onClose={() => setPopupVehicleId(null)}
        >
          <VehiclePopupCard vehicle={popupVehicle} frame={popupFrame} />
        </Popup>
      )}
    </Map>
  );
}
