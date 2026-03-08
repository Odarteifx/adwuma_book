import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import { bookingLimiter, checkRateLimit } from "@/lib/rate-limit";

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitRes = await checkRateLimit(request, bookingLimiter());
    if (rateLimitRes) return rateLimitRes;

    const body = await request.json();
    const {
      business_id,
      service_ids,
      booking_date,
      start_time,
      customer_name,
      customer_email,
      customer_phone,
      notes,
    } = body;

    if (
      !business_id ||
      !Array.isArray(service_ids) ||
      service_ids.length === 0 ||
      !booking_date ||
      !start_time ||
      !customer_name ||
      !customer_phone
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch and verify all services
    const { data: services } = await supabase
      .from("services")
      .select("id, price, deposit_type, deposit_value, duration_minutes")
      .eq("business_id", business_id)
      .eq("is_active", true)
      .in("id", service_ids);

    if (!services || services.length !== service_ids.length) {
      return NextResponse.json(
        { error: "One or more services not found" },
        { status: 404 }
      );
    }

    // Order services by the order of service_ids
    const orderedServices = service_ids
      .map((id: string) => services.find((s) => s.id === id))
      .filter((s): s is (typeof services)[0] => s != null);

    if (orderedServices.length !== service_ids.length) {
      return NextResponse.json(
        { error: "Invalid service selection" },
        { status: 400 }
      );
    }

    // Compute time slots for each service (sequential)
    let currentMinutes = timeToMinutes(start_time);
    const bookingItems: Array<{
      service: (typeof services)[0];
      start_time: string;
      end_time: string;
      deposit: number;
      total_price: number;
    }> = [];

    for (const service of orderedServices) {
      const startTimeStr = minutesToTime(currentMinutes);
      const endMinutes = currentMinutes + service.duration_minutes;
      const endTimeStr = minutesToTime(endMinutes);

      const deposit =
        service.deposit_type === "percentage"
          ? (Number(service.price) * Number(service.deposit_value)) / 100
          : Number(service.deposit_value);

      bookingItems.push({
        service,
        start_time: startTimeStr,
        end_time: endTimeStr,
        deposit,
        total_price: Number(service.price),
      });

      currentMinutes = endMinutes;
    }

    const blockStart = start_time;
    const blockEnd = minutesToTime(currentMinutes);

    // Check slot availability for entire block
    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", business_id)
      .eq("booking_date", booking_date)
      .lt("start_time", blockEnd)
      .gt("end_time", blockStart)
      .in("status", ["pending_deposit", "confirmed"]);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "This time slot is no longer available" },
        { status: 409 }
      );
    }

    const expiresAt = new Date(
      Date.now() + RESERVATION_EXPIRY_MINUTES * 60 * 1000
    ).toISOString();

    const totalDeposit = bookingItems.reduce((sum, i) => sum + i.deposit, 0);
    const totalPrice = bookingItems.reduce((sum, i) => sum + i.total_price, 0);

    const createdBookings: Array<{ id: string }> = [];

    for (const item of bookingItems) {
      const { data: booking, error } = await supabase
        .from("bookings")
        .insert({
          business_id,
          service_id: item.service.id,
          booking_date,
          start_time: item.start_time,
          end_time: item.end_time,
          customer_name,
          customer_email: customer_email || null,
          customer_phone,
          notes: notes || null,
          deposit_amount: item.deposit,
          total_price: item.total_price,
          status: "pending_deposit",
          payment_status: "unpaid",
          reservation_expires_at: expiresAt,
        })
        .select("id")
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

      createdBookings.push(booking);

      await supabase.from("analytics_events").insert({
        business_id,
        event_type: "booking_created",
        metadata: { booking_id: booking.id, service_id: item.service.id },
      });
    }

    return NextResponse.json({
      booking_ids: createdBookings.map((b) => b.id),
      total_deposit: totalDeposit,
      total_price: totalPrice,
    });
  } catch (error) {
    console.error("Batch booking creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
