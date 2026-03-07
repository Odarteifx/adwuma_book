"use client";

import { useState } from "react";
import type { Business, Service, TimeSlot } from "@/types";
import { ServiceSelector } from "./service-selector";
import { DateTimePicker } from "./date-time-picker";
import { CustomerForm } from "./customer-form";
import { BusinessHeader } from "./business-header";
import { ReviewsSection } from "./reviews-section";
import { AIChatWidget } from "@/components/ai/ai-chat-widget";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import type { HeaderTab } from "./business-header";

type Step = "services" | "datetime" | "details";

interface Props {
  business: Business;
  services: Service[];
  reviewsCount?: number;
}

export function BookingPageClient({ business, services, reviewsCount = 0 }: Props) {
  const [step, setStep] = useState<Step>("services");
  const [headerTab, setHeaderTab] = useState<HeaderTab>("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const primaryColor = business.primary_color || undefined;

  return (
    <div className="min-h-screen bg-background">
      <BusinessHeader
        business={business}
        servicesCount={services.length}
        reviewsCount={reviewsCount}
        primaryColor={primaryColor}
        activeTab={headerTab}
        onTabChange={setHeaderTab}
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
        {/* Reviews tab content */}
        {headerTab === "reviews" && (
          <ReviewsSection businessId={business.id} primaryColor={primaryColor} />
        )}

        {/* About tab content */}
        {headerTab === "about" && (
          <div className="rounded-lg border bg-card p-6">
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {business.description || "No description available."}
            </p>
          </div>
        )}

        {/* Booking flow - only when Services tab */}
        {headerTab === "services" && (
        <>
        {/* Step indicator & back - only from date screen onward */}
        {step !== "services" && (
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-1 h-9 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (step === "datetime") setStep("services");
                if (step === "details") setStep("datetime");
              }}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={step === "datetime" ? "default" : "secondary"}
                className="text-xs"
                style={step === "datetime" && primaryColor ? { backgroundColor: primaryColor } : undefined}
              >
                1. Date & time
              </Badge>
              <Badge
                variant={step === "details" ? "default" : "secondary"}
                className="text-xs"
                style={step === "details" && primaryColor ? { backgroundColor: primaryColor } : undefined}
              >
                2. Details
              </Badge>
            </div>
          </div>
        )}

        {step === "services" && (
          <ServiceSelector
            services={services}
            primaryColor={primaryColor}
            onSelect={(service) => {
              setSelectedService(service);
              setStep("datetime");
            }}
          />
        )}

        {step === "datetime" && selectedService && (
          <DateTimePicker
            business={business}
            service={selectedService}
            primaryColor={primaryColor}
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
              primaryColor={primaryColor}
            />
          )}
        </>
        )}
      </main>

      <AIChatWidget
        businessId={business.id}
        businessName={business.name}
        primaryColor={primaryColor}
      />
    </div>
  );
}
