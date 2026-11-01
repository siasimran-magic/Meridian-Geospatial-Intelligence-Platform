"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { divIcon, type Marker as LeafletMarker } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { NearbyPlace } from "@/types/places";

type MapCanvasProps = {
  center: [number, number];
  places: NearbyPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  onPickLocation: (latitude: number, longitude: number) => void;
};

const categoryColors: Record<string, string> = {
  restaurant: "amber",
  cafe: "rose",
  hospital: "blue",
  grocery: "green",
  parks: "green",
};

function colorFor(place: NearbyPlace) {
  const primary = place.categories[0]?.slug;
  return (primary && categoryColors[primary]) || "slate";
}

function iconFor(place: NearbyPlace) {
  return divIcon({
    className: "poi-marker-shell",
    html: `<span class="poi-marker poi-marker--${colorFor(place)}"><span></span></span>`,
    iconSize: [34, 42],
    iconAnchor: [17, 37],
    popupAnchor: [0, -34],
  });
}

function MapInteractions({
  center,
  selectedPlace,
  markers,
  onPickLocation,
}: {
  center: [number, number];
  selectedPlace: NearbyPlace | null;
  markers: MutableRefObject<Map<string, LeafletMarker>>;
  onPickLocation: (latitude: number, longitude: number) => void;
}) {
  const map = useMap();
  const [latitude, longitude] = center;

  useMapEvents({
    click(event) {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    },
  });

  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom(), { animate: true });
  }, [latitude, longitude, map]);

  useEffect(() => {
    if (!selectedPlace) return;
    map.flyTo([selectedPlace.latitude, selectedPlace.longitude], Math.max(map.getZoom(), 15), {
      duration: 0.45,
    });
    const timer = window.setTimeout(() => {
      markers.current.get(selectedPlace.placeId)?.openPopup();
    }, 220);
    return () => window.clearTimeout(timer);
  }, [map, markers, selectedPlace]);

  return null;
}

export default function MapCanvas({
  center,
  places,
  selectedPlaceId,
  onSelectPlace,
  onPickLocation,
}: MapCanvasProps) {
  const markers = useRef(new Map<string, LeafletMarker>());
  const selectedPlace = places.find((place) => place.placeId === selectedPlaceId) ?? null;

  return (
    <MapContainer
      center={center}
      zoom={14}
      minZoom={3}
      maxZoom={19}
      scrollWheelZoom
      className="map-canvas"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapInteractions
        center={center}
        selectedPlace={selectedPlace}
        markers={markers}
        onPickLocation={onPickLocation}
      />
      {places.map((place) => (
        <Marker
          key={place.placeId}
          position={[place.latitude, place.longitude]}
          icon={iconFor(place)}
          ref={(marker) => {
            if (marker) markers.current.set(place.placeId, marker);
            else markers.current.delete(place.placeId);
          }}
          eventHandlers={{ click: () => onSelectPlace(place.placeId) }}
        >
          <Popup>
            <div className="map-popup">
              <strong>{place.name}</strong>
              <span>{place.averageRating === null ? "No ratings yet" : `★ ${place.averageRating.toFixed(1)}`} · {place.reviewCount} reviews</span>
              <small>{place.categories.map((category) => category.name).join(" · ") || "Uncategorized"}</small>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
