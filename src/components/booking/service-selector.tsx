"use client";

import { useState, useMemo } from "react";
import type { Service } from "@/types";
import { cn } from "@/lib/utils";
import { ServiceCard } from "./service-card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Props {
  services: Service[];
  onSelect: (service: Service) => void;
  primaryColor?: string;
}

function filterServices(services: Service[], query: string): Service[] {
  const q = query.trim().toLowerCase();
  if (!q) return services;
  return services.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      (s.description?.toLowerCase().includes(q) ?? false)
  );
}

export function ServiceSelector({ services, onSelect, primaryColor }: Props) {
  const [search, setSearch] = useState("");
  const filteredServices = useMemo(
    () => filterServices(services, search),
    [services, search]
  );

  if (services.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <p className="text-sm text-muted-foreground">No services available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium sm:text-lg">Services</h2>
        <div
          className="relative w-full sm:w-48"
          style={
            primaryColor
              ? ({ "--search-focus": primaryColor } as React.CSSProperties)
              : undefined
          }
        >
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "h-9 pl-8 text-sm",
              primaryColor &&
                "focus-visible:border-[var(--search-focus)] focus-visible:ring-[var(--search-focus)]"
            )}
            aria-label="Search services"
          />
        </div>
      </div>
      {filteredServices.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          No match for &quot;{search}&quot;
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              variant="select"
              primaryColor={primaryColor}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
