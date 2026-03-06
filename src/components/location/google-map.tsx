"use client";

import { useCallback, useRef } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

interface GoogleMapPickerProps {
  center: { lat: number; lng: number };
  markerPosition: { lat: number; lng: number } | null;
  onMapClick: (lat: number, lng: number) => void;
}

const containerStyle = { width: "100%", height: "256px" };

export default function GoogleMapPicker({
  center,
  markerPosition,
  onMapClick,
}: GoogleMapPickerProps) {
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: ["places"],
  });

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onMapClick]
  );

  if (!isLoaded) {
    return (
      <div
        className="flex h-64 w-full items-center justify-center rounded-lg bg-muted"
        style={{ minHeight: 256 }}
      >
        <span className="text-sm text-muted-foreground">Loading map…</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={13}
      onLoad={onLoad}
      onClick={handleClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: false,
      }}
    >
      {markerPosition && <Marker position={markerPosition} />}
    </GoogleMap>
  );
}
