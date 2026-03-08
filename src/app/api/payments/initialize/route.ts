import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction, generateReference } from "@/lib/paystack";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      booking_id,
      booking_ids: bookingIdsParam,
      total_deposit: totalDepositParam,
      email,
      callback_url,
    } = body;

    const isBatch = Array.isArray(bookingIdsParam) && bookingIdsParam.length > 0;
    const bookingIds = isBatch ? bookingIdsParam : booking_id ? [booking_id] : [];
    const primaryBookingId = bookingIds[0];

    if (!primaryBookingId || !email || !callback_url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking } = await supabase
      .from("bookings")
      .select("*, services(name)")
      .eq("id", primaryBookingId)
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
        .eq("id", primaryBookingId);

      return NextResponse.json(
        { error: "Booking reservation has expired" },
        { status: 410 }
      );
    }

    const depositAmount = isBatch
      ? Number(totalDepositParam)
      : Number(booking.deposit_amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid deposit amount" },
        { status: 400 }
      );
    }

    // Check if payment already exists (for first booking in batch)
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, paystack_reference")
      .eq("booking_id", primaryBookingId)
      .eq("status", "pending")
      .maybeSingle();

    let reference: string;

    if (existingPayment) {
      reference = existingPayment.paystack_reference;
    } else {
      reference = generateReference(primaryBookingId);

      const metadata: Record<string, unknown> = {
        service_name: booking.services?.name,
        customer_name: booking.customer_name,
      };
      if (isBatch && bookingIds.length > 1) {
        metadata.booking_ids = bookingIds;
      }

      const { error: payError } = await supabase.from("payments").insert({
        booking_id: primaryBookingId,
        business_id: booking.business_id,
        amount: depositAmount,
        paystack_reference: reference,
        status: "pending",
        payment_type: "deposit",
        metadata,
      });

      if (payError) {
        return NextResponse.json(
          { error: "Failed to create payment record" },
          { status: 500 }
        );
      }
    }

    const amountInPesewas = Math.round(depositAmount * 100);

    if (!process.env.PAYSTACK_SECRET_KEY) {
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
        booking_id: primaryBookingId,
        business_id: booking.business_id,
        ...(isBatch && bookingIds.length > 1 && { booking_ids: bookingIds }),
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
