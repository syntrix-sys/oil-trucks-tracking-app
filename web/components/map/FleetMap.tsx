"use client";

import { useMemo, useState } from "react";
import Map, { Marker, Popup, Source, Layer, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TelemetryFrame, Vehicle } from "@oiltrack/types";
import { STATUS_COLORS } from "@/lib/formatters";
import { deriveVehicleStatus } from "@/lib/vehicleStatus";
import { useRoadRoutes } from "@/lib/useRoadRoutes";
import { truckColor } from "@/lib/truckColors";
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

  // Road-snapped routes from OSRM — fetched once, fall back to straight lines if unavailable
  const roadRoutes = useRoadRoutes(showRoutes ? vehicles : {});

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
          const color = truckColor(vehicle.id);
          const isSelected = selectedVehicleId === vehicle.id;

          // Use OSRM road-snapped coords when available; fall back to straight-line waypoints
          const roadCoords = roadRoutes[vehicle.id];
          const coords: [number, number][] = roadCoords
            ? roadCoords
            : vehicle.route.waypoints.map((w) => [w.lng, w.lat] as [number, number]);

          const isLoading = !(vehicle.id in roadRoutes);

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
              {/* Soft glow behind selected route */}
              {isSelected && (
                <Layer
                  id={`route-glow-${vehicle.id}`}
                  type="line"
                  paint={{
                    "line-color": color,
                    "line-width": 12,
                    "line-opacity": 0.2,
                    "line-blur": 6,
                  }}
                />
              )}
              <Layer
                id={`route-line-${vehicle.id}`}
                type="line"
                paint={{
                  "line-color": color,
                  "line-width": isSelected ? 4 : 2.5,
                  "line-opacity": isLoading ? 0.12 : isSelected ? 0.95 : 0.55,
                  "line-dasharray": roadCoords ? [1, 0] : [3, 2],
                }}
              />
            </Source>
          );
        })}

      {vehicleList.map((vehicle) => {
        const frame = telemetry[vehicle.id];
        if (!frame) return null;
        const status = deriveVehicleStatus(frame);
        const statusColor = STATUS_COLORS[status];
        const vehicleColor = truckColor(vehicle.id);
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
              style={{ width: 40, height: 40 }}
              title={vehicle.id}
            >
              {/* Outer ring — truck identity color */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  border: `2.5px solid ${vehicleColor}`,
                  opacity: isSelected ? 1 : 0.75,
                  transform: isSelected ? "scale(1.25)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              />
              {/* Inner fill — status color */}
              <div
                className={`absolute inset-1 rounded-full ${status === "alert" ? "animate-pulse-ring" : ""}`}
                style={{ backgroundColor: statusColor, opacity: 0.3 }}
              />
              {/* Truck icon */}
              <img
                src="/icons/tanker.svg"
                alt={vehicle.id}
                width={20}
                height={20}
                style={{
                  transform: `rotate(${frame.location.bearing}deg)`,
                  filter: isSelected
                    ? `drop-shadow(0 0 3px ${vehicleColor})`
                    : undefined,
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
