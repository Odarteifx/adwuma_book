import { createClient } from "@supabase/supabase-js";
import type { TimeSlot } from "@/types";

interface SlotParams {
  businessId: string;
  date: string;
  serviceDurationMinutes: number;
  supabaseUrl: string;
  supabaseKey: string;
}

export async function generateSlots({
  businessId,
  date,
  serviceDurationMinutes,
  supabaseUrl,
  supabaseKey,
}: SlotParams): Promise<TimeSlot[]> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const dateObj = new Date(date + "T00:00:00");
  const dayOfWeek = dateObj.getDay();

  const { data: availability } = await supabase
    .from("availability")
    .select("*")
    .eq("business_id", businessId)
    .eq("day_of_week", dayOfWeek)
    .eq("is_active", true)
    .single();

  if (!availability) return [];

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("id")
    .eq("business_id", businessId)
    .eq("date", date)
    .maybeSingle();

  if (blocked) return [];

  const { data: business } = await supabase
    .from("businesses")
    .select("slot_interval_minutes, max_bookings_per_slot")
    .eq("id", businessId)
    .single();

  const interval = business?.slot_interval_minutes ?? 30;
  const maxPerSlot = business?.max_bookings_per_slot ?? 1;

  const { data: breaks } = await supabase
    .from("availability_breaks")
    .select("*")
    .eq("availability_id", availability.id);

  const { data: existingBookings } = await supabase
    .from("bookings")
    .select("start_time, end_time")
    .eq("business_id", businessId)
    .eq("booking_date", date)
    .in("status", ["pending_deposit", "confirmed"]);

  const startMinutes = timeToMinutes(availability.start_time);
  const endMinutes = timeToMinutes(availability.end_time);

  const slots: TimeSlot[] = [];

  for (let m = startMinutes; m + serviceDurationMinutes <= endMinutes; m += interval) {
    const slotStart = m;
    const slotEnd = m + serviceDurationMinutes;
    const timeStr = minutesToTime(slotStart);

    const inBreak = (breaks || []).some(
      (b: { start_time: string; end_time: string }) => {
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);
        return slotStart < bEnd && slotEnd > bStart;
      }
    );

    const overlappingCount = (existingBookings || []).filter(
      (bk: { start_time: string; end_time: string }) => {
        const bkStart = timeToMinutes(bk.start_time);
        const bkEnd = timeToMinutes(bk.end_time);
        return slotStart < bkEnd && slotEnd > bkStart;
      }
    ).length;

    slots.push({
      time: timeStr,
      available: !inBreak && overlappingCount < maxPerSlot,
    });
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const parts = time.split(":");
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
