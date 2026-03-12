import { NextRequest, NextResponse } from "next/server";
import { confirmPaymentByReference } from "@/lib/confirm-payment";

/**
 * Verify payment by reference (e.g. when user returns from Paystack with ?reference=xxx).
 * Idempotent: safe to call multiple times. Used as fallback when webhook is delayed or fails.
 */
export async function POST(request: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payments not configured" },
      { status: 503 }
    );
  }

  let body: { reference?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const reference =
    typeof body.reference === "string" ? body.reference.trim() : null;
  if (!reference) {
    return NextResponse.json(
      { error: "Missing reference" },
      { status: 400 }
    );
  }

  const result = await confirmPaymentByReference(reference);

  if (result.ok) {
    return NextResponse.json({ verified: true });
  }

  return NextResponse.json(
    { error: result.error },
    { status: result.status }
  );
}
