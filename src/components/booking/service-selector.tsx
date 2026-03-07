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
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No services available at the moment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center sm:text-left">
        <h2 className="text-lg font-semibold tracking-tight">Choose a service</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Select the service you&apos;d like to book
        </p>
      </div>
      <div
        className="relative"
        style={
          primaryColor
            ? ({ "--search-focus": primaryColor } as React.CSSProperties)
            : undefined
        }
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search services..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={cn(
            "h-10 pl-9 transition-colors",
            primaryColor &&
              "focus-visible:border-[var(--search-focus)] focus-visible:ring-[var(--search-focus)]"
          )}
          aria-label="Search services"
        />
      </div>
      {filteredServices.length === 0 ? (
        <div className="flex min-h-[120px] flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No services match &quot;{search}&quot;
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Try a different search term
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
