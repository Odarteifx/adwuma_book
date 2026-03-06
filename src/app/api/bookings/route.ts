import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import { bookingLimiter, checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const rateLimitRes = await checkRateLimit(request, bookingLimiter());
    if (rateLimitRes) return rateLimitRes;

    const body = await request.json();
    const {
      business_id,
      service_id,
      booking_date,
      start_time,
      end_time,
      customer_name,
      customer_email,
      customer_phone,
      notes,
      deposit_amount,
      total_price,
    } = body;

    if (
      !business_id ||
      !service_id ||
      !booking_date ||
      !start_time ||
      !end_time ||
      !customer_name ||
      !customer_phone
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify service exists and belongs to business
    const { data: service } = await supabase
      .from("services")
      .select("id, price, deposit_type, deposit_value")
      .eq("id", service_id)
      .eq("business_id", business_id)
      .eq("is_active", true)
      .single();

    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Verify deposit amount
    const expectedDeposit =
      service.deposit_type === "percentage"
        ? (Number(service.price) * Number(service.deposit_value)) / 100
        : Number(service.deposit_value);

    if (Math.abs(Number(deposit_amount) - expectedDeposit) > 0.01) {
      return NextResponse.json(
        { error: "Invalid deposit amount" },
        { status: 400 }
      );
    }

    // Check slot availability
    const { data: conflict } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", business_id)
      .eq("booking_date", booking_date)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
      .in("status", ["pending_deposit", "confirmed"])
      .maybeSingle();

    if (conflict) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 409 }
      );
    }

    const expiresAt = new Date(
      Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        business_id,
        service_id,
        booking_date,
        start_time,
        end_time,
        customer_name,
        customer_email: customer_email || null,
        customer_phone,
        notes: notes || null,
        deposit_amount,
        total_price,
        status: "pending_deposit",
        payment_status: "unpaid",
        reservation_expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This time slot is no longer available" },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log analytics event
    await supabase.from("analytics_events").insert({
      business_id,
      event_type: "booking_created",
      metadata: { booking_id: booking.id, service_id },
    });

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Booking creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
