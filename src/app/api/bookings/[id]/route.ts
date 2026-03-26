import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const { booking_date, start_time } = body;

    if (!bookingId || !booking_date || !start_time) {
      return NextResponse.json(
        { error: "Missing booking id, booking_date, or start_time" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, business_id, service_id, status, booking_date, start_time, end_time")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (!["pending_deposit", "confirmed"].includes(booking.status)) {
      return NextResponse.json(
        { error: "Only pending or confirmed bookings can be rescheduled" },
        { status: 400 }
      );
    }

    const { data: service } = await supabase
      .from("services")
      .select("duration_minutes")
      .eq("id", booking.service_id)
      .single();

    if (!service?.duration_minutes) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    const startM = timeToMinutes(start_time);
    const endM = startM + Number(service.duration_minutes);
    const end_time = minutesToTime(endM);

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("business_id", booking.business_id)
      .eq("booking_date", booking_date)
      .lt("start_time", end_time)
      .gt("end_time", start_time)
      .in("status", ["pending_deposit", "confirmed"])
      .neq("id", bookingId);

    if (conflicts && conflicts.length > 0) {
      return NextResponse.json(
        { error: "This time slot is not available" },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        booking_date,
        start_time,
        end_time,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    await supabase.from("booking_changes").insert({
      booking_id: bookingId,
      business_id: booking.business_id,
      old_booking_date: booking.booking_date,
      old_start_time: booking.start_time,
      old_end_time: booking.end_time,
      new_booking_date: booking_date,
      new_start_time: start_time,
      new_end_time: end_time,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Booking reschedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
