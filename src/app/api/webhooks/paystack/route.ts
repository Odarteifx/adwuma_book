import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature, verifyTransaction } from "@/lib/paystack";
import { sendBookingConfirmation } from "@/lib/whatsapp";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  let rawBody = "";

  try {
    rawBody = await request.text();
    const signature = request.headers.get("x-paystack-signature") || "";

    // Log webhook before processing
    const event = JSON.parse(rawBody);
    await supabase.from("webhook_logs").insert({
      source: "paystack",
      event_type: event.event,
      payload: event,
    });

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      console.error("Invalid Paystack webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    if (event.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const reference = event.data?.reference;
    if (!reference) {
      return NextResponse.json({ error: "No reference" }, { status: 400 });
    }

    // Idempotency: check if payment already processed
    const { data: payment } = await supabase
      .from("payments")
      .select("id, booking_id, business_id, amount, status")
      .eq("paystack_reference", reference)
      .single();

    if (!payment) {
      console.error("Payment record not found for reference:", reference);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status === "success") {
      return NextResponse.json({ received: true, already_processed: true });
    }

    // Verify transaction with Paystack API
    const txn = await verifyTransaction(reference);

    if (txn.status !== "success") {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      return NextResponse.json({ error: "Transaction not successful" }, { status: 400 });
    }

    // Verify amount matches
    const expectedPesewas = Math.round(Number(payment.amount) * 100);
    if (txn.amount !== expectedPesewas) {
      console.error(
        `Amount mismatch: expected ${expectedPesewas}, got ${txn.amount}`
      );
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
    }

    // Confirm booking via RPC (slot locking)
    const { data: confirmed } = await supabase.rpc(
      "confirm_booking_if_available",
      { p_booking_id: payment.booking_id }
    );

    if (!confirmed) {
      await supabase
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
      // TODO: initiate refund via Paystack
      console.error("Slot no longer available, booking could not be confirmed");
      return NextResponse.json(
        { error: "Slot no longer available" },
        { status: 409 }
      );
    }

    // Update payment to success
    await supabase
      .from("payments")
      .update({
        status: "success",
        paystack_transaction_id: String(txn.id),
      })
      .eq("id", payment.id);

    // Log analytics
    await supabase.from("analytics_events").insert({
      business_id: payment.business_id,
      event_type: "deposit_paid",
      metadata: {
        booking_id: payment.booking_id,
        amount: payment.amount,
        reference,
      },
    });

    await supabase.from("analytics_events").insert({
      business_id: payment.business_id,
      event_type: "booking_confirmed",
      metadata: { booking_id: payment.booking_id },
    });

    // Send WhatsApp notification to vendor
    const { data: booking } = await supabase
      .from("bookings")
      .select("*, services(name)")
      .eq("id", payment.booking_id)
      .single();

    const { data: business } = await supabase
      .from("businesses")
      .select("whatsapp_number")
      .eq("id", payment.business_id)
      .single();

    if (booking && business) {
      await sendBookingConfirmation({
        recipientPhone: business.whatsapp_number,
        customerName: booking.customer_name,
        serviceName: booking.services?.name || "Service",
        date: booking.booking_date,
        time: booking.start_time,
        depositAmount: Number(payment.amount).toFixed(2),
      });
    }

    // Mark webhook as processed
    await supabase
      .from("webhook_logs")
      .update({ processed: true })
      .eq("payload->>reference", reference)
      .eq("source", "paystack");

    return NextResponse.json({ received: true, confirmed: true });
  } catch (error) {
    console.error("Webhook processing error:", error);

    await supabase.from("webhook_logs").insert({
      source: "paystack",
      event_type: "error",
      payload: { raw: rawBody.slice(0, 5000) },
      error: String(error),
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
