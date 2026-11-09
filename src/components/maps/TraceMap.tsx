"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { GPSPoint } from "@/types/gps";

interface TraceMapProps {
  points: GPSPoint[];
  traceTitle?: string;
  userId?: string;
  deviceId?: string;
  height?: string;
}

export default function TraceMap({
  points,
  traceTitle,
  userId,
  deviceId,
  height = "480px",
}: TraceMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Initialize map if not already created
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: true,
      }).setView([12.9716, 77.5946], 12); // Bengaluru default center

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;

    if (!layerGroup || !map) return;

    // Clear previous layers
    layerGroup.clearLayers();

    // Filter valid points with valid coordinates [longitude, latitude]
    const validPoints = (points || []).filter(
      (p) =>
        Array.isArray(p.coordinates) &&
        p.coordinates.length === 2 &&
        !isNaN(p.coordinates[0]) &&
        !isNaN(p.coordinates[1]) &&
        p.coordinates[0] >= -180 &&
        p.coordinates[0] <= 180 &&
        p.coordinates[1] >= -90 &&
        p.coordinates[1] <= 90
    );

    if (validPoints.length === 0) {
      map.setView([12.9716, 77.5946], 11);
      return;
    }

    // Convert [longitude, latitude] to Leaflet [latitude, longitude]
    const latLngs: [number, number][] = validPoints.map((p) => [
      p.coordinates[1],
      p.coordinates[0],
    ]);

    // Draw route polyline with glowing cyan effect
    const routeLine = L.polyline(latLngs, {
      color: "#06b6d4",
      weight: 4,
      opacity: 0.9,
      lineJoin: "round",
    }).addTo(layerGroup);

    // Glowing underlay polyline
    L.polyline(latLngs, {
      color: "#38bdf8",
      weight: 8,
      opacity: 0.25,
      lineJoin: "round",
    }).addTo(layerGroup);

    // Start marker icon (Emerald)
    const startIcon = L.divIcon({
      className: "custom-map-marker",
      html: `
        <div style="
          background-color: #10b981;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0 0 12px rgba(16, 185, 129, 0.8);
        ">A</div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });

    // End marker icon (Rose / Red)
    const endIcon = L.divIcon({
      className: "custom-map-marker",
      html: `
        <div style="
          background-color: #f43f5e;
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0 0 12px rgba(244, 63, 94, 0.8);
        ">B</div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });

    // Intermediate waypoint dot icon (Cyan)
    const waypointIcon = (idx: number) =>
      L.divIcon({
        className: "custom-waypoint-marker",
        html: `
          <div style="
            background-color: #06b6d4;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            border: 1px solid white;
            box-shadow: 0 0 4px #06b6d4;
          "></div>
        `,
        iconSize: [8, 8],
        iconAnchor: [4, 4],
        popupAnchor: [0, -4],
      });

    // Add Start Marker
    const firstPt = validPoints[0];
    const startMarker = L.marker([firstPt.coordinates[1], firstPt.coordinates[0]], {
      icon: startIcon,
    }).addTo(layerGroup);

    startMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px;">
        <div style="font-weight: bold; color: #10b981; margin-bottom: 4px;">Start Point (Origin)</div>
        <div><b>Time:</b> ${new Date(firstPt.timestamp).toLocaleTimeString()}</div>
        <div><b>Coords:</b> [${firstPt.coordinates[0].toFixed(5)}, ${firstPt.coordinates[1].toFixed(5)}]</div>
        <div><b>Speed:</b> ${firstPt.speed} m/s (${(firstPt.speed * 3.6).toFixed(1)} km/h)</div>
        <div><b>Accuracy:</b> &plusmn;${firstPt.accuracy}m</div>
      </div>
    `);

    // Add End Marker
    const lastPt = validPoints[validPoints.length - 1];
    const endMarker = L.marker([lastPt.coordinates[1], lastPt.coordinates[0]], {
      icon: endIcon,
    }).addTo(layerGroup);

    endMarker.bindPopup(`
      <div style="font-family: inherit; font-size: 12px;">
        <div style="font-weight: bold; color: #f43f5e; margin-bottom: 4px;">End Point (Destination)</div>
        <div><b>Time:</b> ${new Date(lastPt.timestamp).toLocaleTimeString()}</div>
        <div><b>Coords:</b> [${lastPt.coordinates[0].toFixed(5)}, ${lastPt.coordinates[1].toFixed(5)}]</div>
        <div><b>Speed:</b> ${lastPt.speed} m/s (${(lastPt.speed * 3.6).toFixed(1)} km/h)</div>
        <div><b>Accuracy:</b> &plusmn;${lastPt.accuracy}m</div>
      </div>
    `);

    // Sample intermediate waypoints for popup inspection (e.g. every 5th point)
    for (let i = 1; i < validPoints.length - 1; i++) {
      if (validPoints.length > 20 && i % Math.ceil(validPoints.length / 10) !== 0) {
        continue;
      }
      const pt = validPoints[i];
      const marker = L.marker([pt.coordinates[1], pt.coordinates[0]], {
        icon: waypointIcon(i),
      }).addTo(layerGroup);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <div style="font-weight: bold; color: #06b6d4; margin-bottom: 4px;">GPS Point #${i + 1}</div>
          <div><b>Time:</b> ${new Date(pt.timestamp).toLocaleTimeString()}</div>
          <div><b>Coords:</b> [${pt.coordinates[0].toFixed(5)}, ${pt.coordinates[1].toFixed(5)}]</div>
          <div><b>Speed:</b> ${pt.speed} m/s (${(pt.speed * 3.6).toFixed(1)} km/h)</div>
          <div><b>Accuracy:</b> &plusmn;${pt.accuracy}m</div>
        </div>
      `);
    }

    // Auto fit bounds to route with generous padding
    try {
      map.fitBounds(routeLine.getBounds(), {
        padding: [35, 35],
        maxZoom: 16,
      });
    } catch {
      // fallback
    }

    // Force map size invalidation in case of delayed container render
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [points]);

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl">
      {/* Top Map Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900/90 px-4 py-2.5 backdrop-blur-md">
        <div className="flex items-center space-x-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            {traceTitle || "Bengaluru Route Trajectory"}
          </span>
        </div>

        <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
          {userId && (
            <span>
              User: <span className="text-cyan-300 font-semibold">{userId}</span>
            </span>
          )}
          {deviceId && (
            <span>
              Device: <span className="text-emerald-300 font-semibold">{deviceId}</span>
            </span>
          )}
          <span>
            Points: <span className="text-amber-300 font-semibold">{points?.length || 0}</span>
          </span>
        </div>
      </div>

      {/* Map DOM Container */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-10" />

      {/* Route Legend */}
      <div className="absolute bottom-3 left-3 z-20 flex items-center space-x-3 rounded-md border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-md shadow-md">
        <div className="flex items-center space-x-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-500 border border-white inline-block"></span>
          <span>Start (A)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-500 border border-white inline-block"></span>
          <span>Destination (B)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-1.5 w-4 bg-cyan-400 inline-block rounded"></span>
          <span>Trajectory</span>
        </div>
      </div>
    </div>
  );
}
