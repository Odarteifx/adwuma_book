import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/paystack";
import { confirmPaymentByReference } from "@/lib/confirm-payment";

export async function POST(request: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    console.error("Paystack webhook called but PAYSTACK_SECRET_KEY is not set");
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

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

    const result = await confirmPaymentByReference(reference);

    // Mark webhook as processed
    const { data: logRow } = await supabase
      .from("webhook_logs")
      .select("id")
      .eq("source", "paystack")
      .eq("event_type", "charge.success")
      .contains("payload", { data: { reference } })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (logRow) {
      await supabase
        .from("webhook_logs")
        .update({ processed: true })
        .eq("id", logRow.id);
    }

    if (result.ok) {
      return NextResponse.json({ received: true, confirmed: true });
    }

    console.error("Webhook confirmPaymentByReference failed:", result.error);
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    );
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
