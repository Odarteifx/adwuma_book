"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { MapPin, Search, ChevronDown, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet-map"), { ssr: false });

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    city?: string;
    town?: string;
    suburb?: string;
    state?: string;
    country?: string;
  };
}

interface LocationPickerProps {
  value: string;
  latitude?: number | null;
  longitude?: number | null;
  onChange: (location: string, lat: number | null, lng: number | null) => void;
}

export function LocationPicker({
  value,
  latitude,
  longitude,
  onChange,
}: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    latitude && longitude ? [latitude, longitude] : [5.6037, -0.187]
  );
  const [markerPos, setMarkerPos] = useState<[number, number] | null>(
    latitude && longitude ? [latitude, longitude] : null
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (resultsRef.current && !resultsRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = useCallback(async (query: string) => {
    if (query.length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + " Ghana"
        )}&limit=5&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowResults(true);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  function handleSearchInput(q: string) {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchLocation(q), 400);
  }

  function selectResult(result: NominatimResult) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const addr = result.address;
    const locationStr =
      addr
        ? [addr.suburb, addr.city || addr.town, addr.state]
            .filter(Boolean)
            .join(", ") || result.display_name.split(",").slice(0, 3).join(",")
        : result.display_name.split(",").slice(0, 3).join(",");

    onChange(locationStr, lat, lng);
    setSearchQuery(locationStr);
    setMapCenter([lat, lng]);
    setMarkerPos([lat, lng]);
    setShowResults(false);
  }

  function handleMapClick(lat: number, lng: number) {
    setMarkerPos([lat, lng]);
    setMapCenter([lat, lng]);
    reverseGeocode(lat, lng);
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data: NominatimResult = await res.json();
      const addr = data.address;
      const locationStr = addr
        ? [addr.suburb, addr.city || addr.town, addr.state]
            .filter(Boolean)
            .join(", ") || data.display_name.split(",").slice(0, 3).join(",")
        : data.display_name.split(",").slice(0, 3).join(",");

      onChange(locationStr, lat, lng);
      setSearchQuery(locationStr);
    } catch {
      onChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`, lat, lng);
    }
  }

  function clearLocation() {
    onChange("", null, null);
    setSearchQuery("");
    setMarkerPos(null);
    setShowResults(false);
  }

  return (
    <div className="space-y-2">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <Input
              placeholder="East Legon, Accra"
              value={value}
              onChange={(e) => {
                onChange(e.target.value, latitude ?? null, longitude ?? null);
              }}
            />
          </div>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 shrink-0"
            >
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-3 space-y-3">
          <div className="relative" ref={resultsRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search for a place in Ghana..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="pl-9 pr-16"
              />
              <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                {searching && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearLocation}
                    className="rounded p-0.5 hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {showResults && results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
                {results.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors first:rounded-t-md last:rounded-b-md"
                    onClick={() => selectResult(r)}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="line-clamp-2">{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border">
            <LeafletMap
              center={mapCenter}
              markerPosition={markerPos}
              onMapClick={handleMapClick}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Click on the map to pin your exact location, or search above.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
