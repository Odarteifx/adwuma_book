import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateSlots } from "@/lib/slots";

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

  const { data: blocked } = await supabase
    .from("blocked_dates")
    .select("date")
    .eq("business_id", businessId)
    .gte("date", startDate)
    .lte("date", endDate);

  const blockedSet = new Set((blocked || []).map((b: { date: string }) => b.date));
  const blockedDates = Array.from(blockedSet);

  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const fullDates: string[] = [];

  const current = new Date(start);
  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];

    if (!blockedSet.has(dateStr)) {
      const slots = await generateSlots({
        businessId,
        date: dateStr,
        serviceDurationMinutes: parseInt(duration),
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      });

      const hasAvailable = slots.some((s) => s.available);
      if (slots.length > 0 && !hasAvailable) {
        fullDates.push(dateStr);
      }
    }

    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json({ fullDates, blockedDates });
}
