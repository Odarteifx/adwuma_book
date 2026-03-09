"use client";

import { useState } from "react";
import type { Business, Service, TimeSlot } from "@/types";
import { useBookingCart } from "@/context/booking-cart-context";
import { ServiceSelector } from "./service-selector";
import { DateTimePicker } from "./date-time-picker";
import { CustomerForm } from "./customer-form";
import { BusinessHeader } from "./business-header";
import { ReviewsSection } from "./reviews-section";
import { AIChatWidget } from "@/components/ai/ai-chat-widget";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { HeaderTab } from "./business-header";

type Step = "services" | "datetime" | "details";

interface Props {
  business: Business;
  services: Service[];
  reviewsCount?: number;
}

export function BookingPageClient({ business, services, reviewsCount = 0 }: Props) {
  const { cart, addToCart, removeFromCart } = useBookingCart();
  const [step, setStep] = useState<Step>("services");
  const [headerTab, setHeaderTab] = useState<HeaderTab>("services");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const primaryColor = business.primary_color || undefined;

  function handleBookNow(service: Service) {
    setSelectedService(service);
    setStep("datetime");
  }

  function handleProceedToCheckout() {
    if (cart.length > 0) {
      setSelectedService(null);
      setStep("datetime");
    }
  }

  function handleAddToCartFromDateTime() {
    if (selectedService) {
      addToCart(selectedService);
      setSelectedService(null);
      setStep("services");
    }
  }

  const servicesToBook =
    selectedService ? [...cart, selectedService] : cart;

  return (
    <div className="min-h-[100dvh] bg-background">
      <BusinessHeader
        business={business}
        servicesCount={services.length}
        reviewsCount={reviewsCount}
        primaryColor={primaryColor}
        activeTab={headerTab}
        onTabChange={setHeaderTab}
        cart={cart}
        onRemoveFromCart={removeFromCart}
        onProceedToCheckout={handleProceedToCheckout}
      />

      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
        {/* Reviews tab content */}
        {headerTab === "reviews" && (
          <ReviewsSection businessId={business.id} primaryColor={primaryColor} />
        )}

        {/* About tab content */}
        {headerTab === "about" && (
          <div className="rounded-lg border border-border/60 p-4 sm:p-6">
            <h2 className="text-base font-medium">About</h2>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              {business.description || "No description available."}
            </p>
          </div>
        )}

        {/* Booking flow - only when Services tab */}
        {headerTab === "services" && (
        <>
        {/* Back - only from date screen onward */}
        {step !== "services" && (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-1 h-8 text-muted-foreground hover:text-foreground"
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
            primaryColor={primaryColor}
            onSelect={handleBookNow}
          />
        )}

        {step === "datetime" && servicesToBook.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <DateTimePicker
            business={business}
            services={servicesToBook}
            primaryColor={primaryColor}
            selectedService={selectedService}
            onAddToCart={handleAddToCartFromDateTime}
            onSelect={(date, slot) => {
              setSelectedDate(date);
              setSelectedSlot(slot);
              setStep("details");
            }}
          />
          </div>
        )}

        {step === "details" &&
          servicesToBook.length > 0 &&
          selectedDate &&
          selectedSlot && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <CustomerForm
              business={business}
              services={servicesToBook}
              date={selectedDate}
              slot={selectedSlot}
              primaryColor={primaryColor}
            />
            </div>
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
