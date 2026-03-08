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
  const { cart, addToCart, removeFromCart, clearCart, isInCart } = useBookingCart();
  const [step, setStep] = useState<Step>("services");
  const [headerTab, setHeaderTab] = useState<HeaderTab>("services");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const primaryColor = business.primary_color || undefined;

  function handleBookNow(service: Service) {
    clearCart();
    addToCart(service);
    setStep("datetime");
  }

  function handleProceedToCheckout() {
    if (cart.length > 0) setStep("datetime");
  }

  const servicesToBook = cart;

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

      <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-10">
        {/* Reviews tab content */}
        {headerTab === "reviews" && (
          <ReviewsSection businessId={business.id} primaryColor={primaryColor} />
        )}

        {/* About tab content */}
        {headerTab === "about" && (
          <div className="animate-in fade-in duration-300 rounded-xl border bg-card p-5 sm:p-8">
            <h2 className="text-lg font-semibold">About</h2>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {business.description || "No description available."}
            </p>
          </div>
        )}

        {/* Booking flow - only when Services tab */}
        {headerTab === "services" && (
        <>
        {/* Step indicator & back - only from date screen onward */}
        {step !== "services" && (
          <div className="animate-in fade-in duration-200 mb-6 flex flex-wrap items-center gap-4">
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
            onSelect={handleBookNow}
            onAddToCart={addToCart}
            isInCart={isInCart}
          />
        )}

        {step === "datetime" && servicesToBook.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <DateTimePicker
            business={business}
            services={servicesToBook}
            primaryColor={primaryColor}
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
