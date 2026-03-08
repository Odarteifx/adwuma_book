"use client";

import type { Business, Service } from "@/types";
import { ServiceCard } from "./service-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock } from "lucide-react";

interface ServiceSummaryCardProps {
  business: Business;
  service: Service;
  selectedDate?: string;
  selectedTime?: string;
}

export function ServiceSummaryCard({
  business,
  service,
  selectedDate,
  selectedTime,
}: ServiceSummaryCardProps) {
  return (
    <div className="h-full min-w-0">
      <ServiceCard
        service={service}
        variant="summary"
        business={business}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        primaryColor={business.primary_color || undefined}
      />
    </div>
  );
}

interface ServicesSummaryCardProps {
  business: Business;
  services: Service[];
  selectedDate?: string;
  selectedTime?: string;
}

export function ServicesSummaryCard({
  business,
  services,
  selectedDate,
  selectedTime,
}: ServicesSummaryCardProps) {
  if (services.length === 1) {
    return (
      <ServiceSummaryCard
        business={business}
        service={services[0]}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
      />
    );
  }

  const totalPrice = services.reduce((sum, s) => sum + Number(s.price), 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);

  return (
    <Card className="h-full overflow-hidden border shadow-sm">
      <CardHeader className="space-y-0.5 px-3 py-2.5 sm:px-4 sm:py-3">
        {business.logo_url && (
          <div className="flex items-center gap-2">
            <img
              src={business.logo_url}
              alt=""
              className="h-5 w-5 rounded-full object-cover sm:h-6 sm:w-6"
            />
            <p className="text-xs font-medium text-muted-foreground">{business.name}</p>
          </div>
        )}
        <p className="font-semibold">{services.length} services</p>
      </CardHeader>
      <CardContent className="space-y-2 border-t px-3 py-2 sm:px-4 sm:py-2.5">
        <ul className="space-y-1.5 text-sm">
          {services.map((s) => (
            <li key={s.id} className="flex justify-between gap-2">
              <span className="truncate">{s.name}</span>
              <span className="shrink-0 font-medium">GHS {Number(s.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {totalDuration} min total
          </span>
          <span className="font-semibold">GHS {totalPrice.toFixed(2)}</span>
        </div>
        {selectedDate && selectedTime && (
          <p className="text-xs text-muted-foreground">
            {selectedDate} at {selectedTime}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
