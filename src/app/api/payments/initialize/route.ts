import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction, generateReference } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    const { booking_id, email, callback_url } = await request.json();

    if (!booking_id || !email || !callback_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select("*, services(name)")
      .eq("id", booking_id)
      .single();

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.status !== "pending_deposit") {
      return NextResponse.json(
        { error: "Booking is not in pending state" },
        { status: 400 }
      );
    }

    // Check if reservation expired
    if (
      booking.reservation_expires_at &&
      new Date(booking.reservation_expires_at) < new Date()
    ) {
      await supabase
        .from("bookings")
        .update({ status: "expired" })
        .eq("id", booking_id);

      return NextResponse.json(
        { error: "Booking reservation has expired" },
        { status: 410 }
      );
    }

    // Check if payment already exists
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status")
      .eq("booking_id", booking_id)
      .eq("status", "pending")
      .maybeSingle();

    let reference: string;

    if (existingPayment) {
      // Reuse existing pending payment reference
      const { data: pay } = await supabase
        .from("payments")
        .select("paystack_reference")
        .eq("id", existingPayment.id)
        .single();
      reference = pay!.paystack_reference;
    } else {
      reference = generateReference(booking_id);

      // Create payment record
      const { error: payError } = await supabase.from("payments").insert({
        booking_id,
        business_id: booking.business_id,
        amount: booking.deposit_amount,
        paystack_reference: reference,
        status: "pending",
        payment_type: "deposit",
        metadata: {
          service_name: booking.services?.name,
          customer_name: booking.customer_name,
        },
      });

      if (payError) {
        return NextResponse.json(
          { error: "Failed to create payment record" },
          { status: 500 }
        );
      }
    }

    // Convert to pesewas (GHS subunit)
    const amountInPesewas = Math.round(Number(booking.deposit_amount) * 100);

    if (!process.env.PAYSTACK_SECRET_KEY) {
      // Dev mode: skip actual Paystack and redirect directly
      return NextResponse.json({
        authorization_url: null,
        reference,
        dev_mode: true,
      });
    }

    const result = await initializeTransaction({
      email,
      amount: amountInPesewas,
      reference,
      callback_url,
      metadata: {
        booking_id,
        business_id: booking.business_id,
      },
    });

    return NextResponse.json({
      authorization_url: result.authorization_url,
      reference: result.reference,
    });
  } catch (error) {
    console.error("Payment init error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
