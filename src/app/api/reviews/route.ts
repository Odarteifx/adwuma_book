import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "businessId is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, booking_id, customer_name, customer_email, rating, comment } = body;

    if (!business_id || !customer_name || !rating) {
      return NextResponse.json(
        { error: "business_id, customer_name, and rating are required" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", business_id)
      .eq("is_active", true)
      .single();

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const { data: review, error } = await supabase
      .from("reviews")
      .insert({
        business_id,
        booking_id: booking_id || null,
        customer_name,
        customer_email: customer_email || null,
        rating,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(review);
  } catch {
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
