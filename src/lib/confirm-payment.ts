import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTransaction } from "@/lib/paystack";
import { sendBookingConfirmation } from "@/lib/whatsapp";

export type ConfirmPaymentResult =
  | { ok: true }
  | { ok: false; status: number; error: string };

/**
 * Verify payment with Paystack and confirm booking(s). Idempotent.
 * Used by both the webhook and the callback verify API.
 */
export async function confirmPaymentByReference(
  reference: string
): Promise<ConfirmPaymentResult> {
  const supabase = createAdminClient();

  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id, business_id, amount, status, metadata")
    .eq("paystack_reference", reference)
    .single();

  if (!payment) {
    return { ok: false, status: 404, error: "Payment not found" };
  }

  if (payment.status === "success") {
    return { ok: true };
  }

  let txn: { status: string; amount: number; id: number };
  try {
    txn = await verifyTransaction(reference);
  } catch (e) {
    console.error("Paystack verify failed:", e);
    return { ok: false, status: 400, error: "Verification failed" };
  }

  if (txn.status !== "success") {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return { ok: false, status: 400, error: "Transaction not successful" };
  }

  const expectedPesewas = Math.round(Number(payment.amount) * 100);
  if (txn.amount !== expectedPesewas) {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return { ok: false, status: 400, error: "Amount mismatch" };
  }

  const bookingIdsToConfirm =
    (payment.metadata as { booking_ids?: string[] })?.booking_ids ?? [
      payment.booking_id,
    ];

  let allConfirmed = true;
  for (const bid of bookingIdsToConfirm) {
    const { data: confirmed } = await supabase.rpc(
      "confirm_booking_if_available",
      { p_booking_id: bid }
    );
    if (!confirmed) {
      allConfirmed = false;
      break;
    }
  }

  if (!allConfirmed) {
    await supabase
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return { ok: false, status: 409, error: "Slot no longer available" };
  }

  await supabase
    .from("payments")
    .update({
      status: "success",
      paystack_transaction_id: String(txn.id),
    })
    .eq("id", payment.id);

  const bookingIdsForAnalytics =
    (payment.metadata as { booking_ids?: string[] })?.booking_ids ?? [
      payment.booking_id,
    ];

  await supabase.from("analytics_events").insert({
    business_id: payment.business_id,
    event_type: "deposit_paid",
    metadata: {
      booking_id: payment.booking_id,
      booking_ids: bookingIdsForAnalytics,
      amount: payment.amount,
      reference,
    },
  });

  for (const bid of bookingIdsForAnalytics) {
    await supabase.from("analytics_events").insert({
      business_id: payment.business_id,
      event_type: "booking_confirmed",
      metadata: { booking_id: bid },
    });
  }

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
    try {
      const serviceNames =
        bookingIdsForAnalytics.length > 1
          ? `${bookingIdsForAnalytics.length} services`
          : booking.services?.name || "Service";

      await sendBookingConfirmation({
        recipientPhone: business.whatsapp_number,
        customerName: booking.customer_name,
        serviceName: serviceNames,
        date: booking.booking_date,
        time: booking.start_time,
        depositAmount: Number(payment.amount).toFixed(2),
      });
    } catch (e) {
      console.error("WhatsApp notification failed:", e);
    }
  }

  return { ok: true };
}
