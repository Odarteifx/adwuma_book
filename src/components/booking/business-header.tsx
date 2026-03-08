"use client";

import { useState } from "react";
import type { Business, Service } from "@/types";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Copy,
  Facebook,
  Instagram,
  Linkedin,
  Twitter,
} from "lucide-react";
import { toast } from "sonner";
import { CartDrawer } from "./cart-drawer";

export type HeaderTab = "services" | "about" | "reviews";

interface Props {
  business: Business;
  servicesCount: number;
  reviewsCount?: number;
  primaryColor?: string;
  activeTab?: HeaderTab;
  onTabChange?: (tab: HeaderTab) => void;
  cart?: Service[];
  onRemoveFromCart?: (serviceId: string) => void;
  onProceedToCheckout?: () => void;
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function BusinessHeader({
  business,
  servicesCount,
  reviewsCount = 0,
  primaryColor,
  activeTab: controlledTab,
  onTabChange,
  cart = [],
  onRemoveFromCart,
  onProceedToCheckout,
}: Props) {
  const [internalTab, setInternalTab] = useState<HeaderTab>("services");

  const activeTab = controlledTab ?? internalTab;

  function setActiveTab(tab: HeaderTab) {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalTab(tab);
    }
  }

  const whatsappUrl = business.whatsapp_number
    ? `https://wa.me/${business.whatsapp_number.replace(/\D/g, "")}`
    : null;

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  }

  const hasShare =
    business.facebook_url ||
    business.instagram_url ||
    business.twitter_url ||
    business.linkedin_url ||
    whatsappUrl ||
    true; // Always show for copy link

  return (
    <header
      className="overflow-hidden bg-card"
      style={
        primaryColor
          ? ({ "--header-accent": primaryColor } as React.CSSProperties)
          : undefined
      }
    >
      {/* Banner (optional) */}
      {business.banner_url && (
        <div className="relative h-20 w-full overflow-hidden sm:h-24">
          <img
            src={business.banner_url}
            alt=""
            className="h-full w-full object-cover opacity-90"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent"
            aria-hidden
          />
        </div>
      )}

      {/* Accent strip */}
      <div
        className="h-1 w-full"
        style={
          primaryColor
            ? { backgroundColor: primaryColor }
            : { backgroundColor: "hsl(var(--muted-foreground) / 0.2)" }
        }
      />

      <div className="mx-auto max-w-4xl animate-in fade-in duration-500 px-4 pt-4 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
        {/* Logo + Info + Share */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
            {/* Logo - square with rounded corners, overlapping accent */}
            <div className="-mt-2 shrink-0">
              {business.logo_url ? (
                <img
                  src={business.logo_url}
                  alt=""
                  className="h-12 w-12 rounded-xl border-2 border-background object-cover shadow-md sm:h-16 sm:w-16"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-background text-lg font-bold text-white shadow-md sm:h-16 sm:w-16"
                  style={
                    primaryColor
                      ? { backgroundColor: primaryColor }
                      : { backgroundColor: "hsl(var(--muted-foreground))" }
                  }
                >
                  {business.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold tracking-tight sm:text-2xl">
                {business.name}
              </h1>
              {business.location && (
                <a
                  href={
                    business.latitude != null && business.longitude != null
                      ? `https://www.google.com/maps?q=${business.latitude},${business.longitude}`
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-0.5 flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="View location on Google Maps"
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {business.location}
                </a>
              )}
              {/* Tabs - right under location with spacing, above the line */}
              <nav
                className="mt-4 flex flex-wrap gap-6 sm:gap-8"
                aria-label="Sections"
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("services")}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    activeTab === "services"
                  ? primaryColor
                    ? "text-[var(--header-accent)]"
                    : "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Services</span>
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                      activeTab === "services" && primaryColor
                        ? "bg-[var(--header-accent)] text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                    style={
                      activeTab === "services" && primaryColor
                        ? { backgroundColor: primaryColor }
                        : undefined
                    }
                  >
                    {servicesCount}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("about")}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    activeTab === "about"
                  ? primaryColor
                    ? "text-[var(--header-accent)]"
                    : "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>About</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("reviews")}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors",
                    activeTab === "reviews"
                  ? primaryColor
                    ? "text-[var(--header-accent)]"
                    : "text-primary"
                  : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>Reviews</span>
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs",
                      activeTab === "reviews" && primaryColor
                        ? "bg-[var(--header-accent)] text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                    style={
                      activeTab === "reviews" && primaryColor
                        ? { backgroundColor: primaryColor }
                        : undefined
                    }
                  >
                    {reviewsCount}
                  </span>
                </button>
              </nav>
            </div>
          </div>

          {/* Cart + Share - full width on mobile, right-aligned on desktop */}
          <div className="flex w-full flex-row flex-wrap items-center justify-between gap-3 border-t pt-4 sm:w-auto sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:pt-0 sm:gap-4">
          {cart.length > 0 && onRemoveFromCart && onProceedToCheckout && (
            <CartDrawer
              business={business}
              cart={cart}
              onRemove={onRemoveFromCart}
              onProceed={onProceedToCheckout}
              primaryColor={primaryColor}
            />
          )}
          {hasShare && (
            <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Share
              </span>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    "min-h-[44px] min-w-[44px] rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                    primaryColor && "hover:text-[var(--header-accent)]"
                  )}
                  aria-label="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </button>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                      primaryColor && "hover:text-[var(--header-accent)]"
                    )}
                    aria-label="WhatsApp"
                  >
                    <WhatsAppIcon className="h-4 w-4" />
                  </a>
                )}
                {business.twitter_url && (
                  <a
                    href={business.twitter_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                      primaryColor && "hover:text-[var(--header-accent)]"
                    )}
                    aria-label="X"
                  >
                    <Twitter className="h-4 w-4" />
                  </a>
                )}
                {business.facebook_url && (
                  <a
                    href={business.facebook_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                      primaryColor && "hover:text-[var(--header-accent)]"
                    )}
                    aria-label="Facebook"
                  >
                    <Facebook className="h-4 w-4" />
                  </a>
                )}
                {business.linkedin_url && (
                  <a
                    href={business.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                      primaryColor && "hover:text-[var(--header-accent)]"
                    )}
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-4 w-4" />
                  </a>
                )}
                {business.instagram_url && (
                  <a
                    href={business.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                      primaryColor && "hover:text-[var(--header-accent)]"
                    )}
                    aria-label="Instagram"
                  >
                    <Instagram className="h-4 w-4" />
                  </a>
                )}
                {business.tiktok_url && (
                  <a
                    href={business.tiktok_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:bg-muted sm:min-h-0 sm:min-w-0",
                      primaryColor && "hover:text-[var(--header-accent)]"
                    )}
                    aria-label="TikTok"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

        {/* Line separator */}
        <div className="mt-3 border-t" />
      </div>
    </header>
  );
}
