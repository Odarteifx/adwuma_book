import { NextRequest, NextResponse } from "next/server";
import { generateSlots } from "@/lib/slots";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const businessId = searchParams.get("businessId");
  const date = searchParams.get("date");
  const duration = searchParams.get("duration");

  if (!businessId || !date || !duration) {
    return NextResponse.json(
      { error: "Missing businessId, date, or duration" },
      { status: 400 }
    );
  }

  const slots = await generateSlots({
    businessId,
    date,
    serviceDurationMinutes: parseInt(duration),
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  });

  return NextResponse.json(slots);
}
