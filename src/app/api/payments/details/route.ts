import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PAYSTACK_BASE = "https://api.paystack.co";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const reference = searchParams.get("reference");

  if (!reference?.trim()) {
    return NextResponse.json(
      { error: "reference is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("id, business_id, amount, status, paystack_reference")
    .eq("paystack_reference", reference.trim())
    .eq("business_id", business.id)
    .single();

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference.trim())}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
    }
  );

  const json = await res.json();
  if (!json.status || !json.data) {
    return NextResponse.json(
      { error: json.message || "Failed to fetch transaction details" },
      { status: 400 }
    );
  }

  const data = json.data as {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    channel?: string;
    authorization?: {
      channel?: string;
      card_type?: string;
      last4?: string;
      bank?: string;
    };
    paid_at?: string;
    created_at?: string;
  };

  return NextResponse.json({
    ...data,
    channel: data.channel || data.authorization?.channel || "unknown",
    payment_method: formatPaymentMethod(data.channel || data.authorization?.channel),
  });
}

function formatPaymentMethod(channel?: string): string {
  if (!channel) return "Unknown";
  const map: Record<string, string> = {
    card: "Card",
    bank: "Bank Transfer",
    ussd: "USSD",
    qr: "QR Code",
    mobile_money: "Mobile Money",
    bank_transfer: "Bank Transfer",
    eft: "EFT",
  };
  return map[channel] || channel.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
