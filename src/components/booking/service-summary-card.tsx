"use client";

import type { Business, Service } from "@/types";
import { ServiceCard } from "./service-card";

interface Props {
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
}: Props) {
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
