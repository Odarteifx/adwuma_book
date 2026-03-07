import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("businessId");
  const duration = searchParams.get("duration");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  if (!businessId || !duration || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Missing businessId, duration, startDate, or endDate" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const serviceDurationMinutes = parseInt(duration, 10);

  // Batch all required data (4 parallel + 1 dependent = 2 round-trips)
  const [
    { data: availabilityRows },
    { data: blockedRows },
    { data: business },
    { data: bookings },
  ] = await Promise.all([
    supabase
      .from("availability")
      .select("id, day_of_week, start_time, end_time, is_active")
      .eq("business_id", businessId)
      .eq("is_active", true),
    supabase
      .from("blocked_dates")
      .select("date")
      .eq("business_id", businessId)
      .gte("date", startDate)
      .lte("date", endDate),
    supabase
      .from("businesses")
      .select("slot_interval_minutes, max_bookings_per_slot")
      .eq("id", businessId)
      .single(),
    supabase
      .from("bookings")
      .select("booking_date, start_time, end_time")
      .eq("business_id", businessId)
      .gte("booking_date", startDate)
      .lte("booking_date", endDate)
      .in("status", ["pending_deposit", "confirmed"]),
  ]);

  const availIds = (availabilityRows || []).map((a: { id: string }) => a.id).filter(Boolean);
  const { data: breaksRows } = availIds.length > 0
    ? await supabase
        .from("availability_breaks")
        .select("availability_id, start_time, end_time")
        .in("availability_id", availIds)
    : { data: [] };

  const blockedSet = new Set(
    (blockedRows || []).map((b: { date: string }) => b.date)
  );
  const blockedDates = Array.from(blockedSet);

  const availabilityByDay = new Map<
    number,
    { id: string; start_time: string; end_time: string }
  >();
  for (const a of availabilityRows || []) {
    availabilityByDay.set(a.day_of_week, {
      id: a.id,
      start_time: a.start_time?.slice(0, 5) ?? "09:00",
      end_time: a.end_time?.slice(0, 5) ?? "17:00",
    });
  }

  const breaksByAvailId = new Map<string, Array<{ start_time: string; end_time: string }>>();
  for (const b of breaksRows || []) {
    const aid = b.availability_id;
    if (!breaksByAvailId.has(aid)) breaksByAvailId.set(aid, []);
    breaksByAvailId.get(aid)!.push({
      start_time: b.start_time?.slice(0, 5) ?? b.start_time,
      end_time: b.end_time?.slice(0, 5) ?? b.end_time,
    });
  }

  const interval = business?.slot_interval_minutes ?? 30;
  const maxPerSlot = business?.max_bookings_per_slot ?? 1;

  const bookingsByDate = new Map<string, Array<{ start_time: string; end_time: string }>>();
  for (const b of bookings || []) {
    const d = b.booking_date;
    if (!bookingsByDate.has(d)) bookingsByDate.set(d, []);
    bookingsByDate.get(d)!.push({
      start_time: b.start_time?.slice(0, 5) ?? b.start_time,
      end_time: b.end_time?.slice(0, 5) ?? b.end_time,
    });
  }

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fullDates: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    if (current < today) {
      current.setDate(current.getDate() + 1);
      continue;
    }
    if (blockedSet.has(dateStr)) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const dayOfWeek = current.getDay();
    const avail = availabilityByDay.get(dayOfWeek);
    if (!avail) {
      current.setDate(current.getDate() + 1);
      continue;
    }

    const startMinutes = timeToMinutes(avail.start_time);
    const endMinutes = timeToMinutes(avail.end_time);
    const breaks = breaksByAvailId.get(avail.id) || [];
    const existingBookings = bookingsByDate.get(dateStr) || [];
    let hasAvailable = false;

    for (let m = startMinutes; m + serviceDurationMinutes <= endMinutes; m += interval) {
      const slotStart = m;
      const slotEnd = m + serviceDurationMinutes;
      const inBreak = breaks.some((br) => {
        const bStart = timeToMinutes(br.start_time);
        const bEnd = timeToMinutes(br.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      });
      if (inBreak) continue;
      const overlappingCount = existingBookings.filter(
        (bk) => {
          const bkStart = timeToMinutes(bk.start_time);
          const bkEnd = timeToMinutes(bk.end_time);
          return slotStart < bkEnd && slotEnd > bkStart;
        }
      ).length;
      if (overlappingCount < maxPerSlot) {
        hasAvailable = true;
        break;
      }
    }

    if (!hasAvailable) fullDates.push(dateStr);
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({ fullDates, blockedDates });
}
