export type PlanType = "starter" | "business" | "pro";

export type BusinessCategory =
  | "salon"
  | "barber"
  | "nail_tech"
  | "lash_tech"
  | "makeup_artist"
  | "photographer"
  | "decorator"
  | "clinic"
  | "tutor"
  | "restaurant"
  | "event_vendor"
  | "other";

export type BookingStatus =
  | "pending_deposit"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type PaymentStatus = "unpaid" | "paid" | "refunded";

export type DepositType = "fixed" | "percentage";

export type PaymentRecordStatus = "pending" | "success" | "failed";

export type KBDocType = "faq" | "policy" | "info";

export type AnalyticsEventType =
  | "page_view"
  | "booking_created"
  | "deposit_paid"
  | "booking_confirmed"
  | "booking_cancelled"
  | "booking_completed"
  | "ai_chat_started"
  | "ai_chat_to_booking";

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  category: BusinessCategory;
  whatsapp_number: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  primary_color: string;
  logo_url: string | null;
  banner_url: string | null;
  plan: PlanType;
  plan_expires_at: string | null;
  slot_interval_minutes: number;
  max_bookings_per_slot: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  deposit_type: DepositType;
  deposit_value: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Availability {
  id: string;
  business_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  breaks?: AvailabilityBreak[];
}

export interface AvailabilityBreak {
  id: string;
  availability_id: string;
  start_time: string;
  end_time: string;
}

export interface BlockedDate {
  id: string;
  business_id: string;
  date: string;
  reason: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  business_id: string;
  service_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  deposit_amount: number;
  total_price: number;
  notes: string | null;
  reservation_expires_at: string | null;
  created_at: string;
  updated_at: string;
  service?: Service;
}

export interface Payment {
  id: string;
  booking_id: string;
  business_id: string;
  amount: number;
  currency: string;
  paystack_reference: string;
  paystack_transaction_id: string | null;
  status: PaymentRecordStatus;
  payment_type: "deposit" | "full";
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  booking?: Booking;
}

export interface KBDoc {
  id: string;
  business_id: string;
  title: string;
  content: string;
  doc_type: KBDocType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KBChunk {
  id: string;
  doc_id: string;
  business_id: string;
  content: string;
  embedding: number[] | null;
  token_count: number | null;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  business_id: string;
  event_type: AnalyticsEventType;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface WebhookLog {
  id: string;
  source: string;
  event_type: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  error: string | null;
  created_at: string;
}

export interface AIConversation {
  id: string;
  business_id: string;
  session_id: string;
  messages: AIMessage[];
  led_to_booking: boolean;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}
