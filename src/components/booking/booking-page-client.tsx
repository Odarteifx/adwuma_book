"use client";

import { useState } from "react";
import type { Business, Service, TimeSlot } from "@/types";
import { ServiceSelector } from "./service-selector";
import { DateTimePicker } from "./date-time-picker";
import { CustomerForm } from "./customer-form";
import { AIChatWidget } from "@/components/ai/ai-chat-widget";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Clock } from "lucide-react";

type Step = "services" | "datetime" | "details";

interface Props {
  business: Business;
  services: Service[];
}

export function BookingPageClient({ business, services }: Props) {
  const [step, setStep] = useState<Step>("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const primaryColor = business.primary_color || "#6366f1";

  return (
    <div
      className="min-h-screen bg-muted/30"
      style={{ "--business-primary": primaryColor } as React.CSSProperties}
    >
      <header
        className="border-b px-4 py-6 text-white"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="mx-auto max-w-lg">
          {business.banner_url && (
            <img
              src={business.banner_url}
              alt=""
              className="mb-4 h-32 w-full rounded-lg object-cover"
            />
          )}
          <div className="flex items-center gap-3">
            {business.logo_url && (
              <img
                src={business.logo_url}
                alt=""
                className="h-12 w-12 rounded-full object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{business.name}</h1>
              {business.location && (
                <p className="flex items-center gap-1 text-sm opacity-90">
                  <MapPin className="h-3.5 w-3.5" />
                  {business.location}
                </p>
              )}
            </div>
          </div>
          {business.description && (
            <p className="mt-3 text-sm opacity-90">{business.description}</p>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6">
        {step !== "services" && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-4"
            onClick={() => {
              if (step === "datetime") setStep("services");
              if (step === "details") setStep("datetime");
            }}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        )}

        {step === "services" && (
          <ServiceSelector
            services={services}
            onSelect={(service) => {
              setSelectedService(service);
              setStep("datetime");
            }}
          />
        )}

        {step === "datetime" && selectedService && (
          <DateTimePicker
            businessId={business.id}
            serviceDuration={selectedService.duration_minutes}
            onSelect={(date, slot) => {
              setSelectedDate(date);
              setSelectedSlot(slot);
              setStep("details");
            }}
          />
        )}

        {step === "details" &&
          selectedService &&
          selectedDate &&
          selectedSlot && (
            <CustomerForm
              business={business}
              service={selectedService}
              date={selectedDate}
              slot={selectedSlot}
            />
          )}

        {selectedService && step !== "services" && (
          <div className="mt-6 rounded-lg border bg-card p-4">
            <h3 className="mb-2 text-sm font-medium text-muted-foreground">
              Your selection
            </h3>
            <p className="font-medium">{selectedService.name}</p>
            <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
              <span>GHS {Number(selectedService.price).toFixed(2)}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {selectedService.duration_minutes} min
              </span>
            </div>
            {selectedDate && selectedSlot && (
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDate} at {selectedSlot.time}
              </p>
            )}
          </div>
        )}
      </main>

      <AIChatWidget businessId={business.id} businessName={business.name} primaryColor={primaryColor} />
    </div>
  );
}
