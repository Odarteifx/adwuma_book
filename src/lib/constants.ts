import { type BusinessCategory, type PlanType } from "@/types";

export const APP_NAME = "Adwuma Book";
export const APP_DESCRIPTION =
  "The booking platform for Ghanaian service businesses. Accept deposits, reduce no-shows, and delight your customers.";

export const BUSINESS_CATEGORIES: { value: BusinessCategory; label: string }[] =
  [
    { value: "salon", label: "Salon" },
    { value: "barber", label: "Barber" },
    { value: "nail_tech", label: "Nail Tech" },
    { value: "lash_tech", label: "Lash Tech" },
    { value: "makeup_artist", label: "Makeup Artist" },
    { value: "photographer", label: "Photographer" },
    { value: "decorator", label: "Decorator" },
    { value: "clinic", label: "Clinic" },
    { value: "tutor", label: "Tutor" },
    { value: "restaurant", label: "Restaurant" },
    { value: "event_vendor", label: "Event Vendor" },
    { value: "other", label: "Other" },
  ];

export interface PlanConfig {
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    services: number;
    bookingsPerMonth: number;
    aiChatsPerMonth: number;
    kbDocs: number;
  };
}

export const PLANS: Record<PlanType, PlanConfig> = {
  starter: {
    name: "Starter",
    price: 0,
    currency: "GHS",
    features: [
      "Up to 3 services",
      "50 bookings/month",
      "Booking page",
      "WhatsApp notifications",
      "Basic analytics",
    ],
    limits: {
      services: 3,
      bookingsPerMonth: 50,
      aiChatsPerMonth: 50,
      kbDocs: 5,
    },
  },
  business: {
    name: "Business",
    price: 99,
    currency: "GHS",
    features: [
      "Up to 15 services",
      "500 bookings/month",
      "Booking page",
      "WhatsApp notifications",
      "Full analytics",
      "AI customer service",
      "Custom branding",
    ],
    limits: {
      services: 15,
      bookingsPerMonth: 500,
      aiChatsPerMonth: 500,
      kbDocs: 50,
    },
  },
  pro: {
    name: "Pro",
    price: 249,
    currency: "GHS",
    features: [
      "Unlimited services",
      "Unlimited bookings",
      "Booking page",
      "WhatsApp notifications",
      "Full analytics",
      "AI customer service (unlimited)",
      "Custom branding",
      "Priority support",
    ],
    limits: {
      services: Infinity,
      bookingsPerMonth: Infinity,
      aiChatsPerMonth: Infinity,
      kbDocs: Infinity,
    },
  },
};

export const RESERVATION_EXPIRY_MINUTES = 15;

export const DEFAULT_SLOT_INTERVAL = 30;

export const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;
