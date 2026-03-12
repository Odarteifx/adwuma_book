import crypto from "crypto";

const PAYSTACK_BASE = "https://api.paystack.co";

function getSecret(): string | undefined {
  return process.env.PAYSTACK_SECRET_KEY;
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const secret = getSecret();
  if (!secret) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(body)
    .digest("hex");
  return hash === signature;
}

export async function initializeTransaction(params: {
  email: string;
  amount: number; // in pesewas (GHS subunit)
  reference: string;
  callback_url: string;
  metadata?: Record<string, unknown>;
}) {
  const secret = getSecret();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callback_url,
      currency: "GHS",
      metadata: params.metadata,
    }),
  });

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || "Failed to initialize transaction");
  }

  return data.data as {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export async function verifyTransaction(reference: string) {
  const secret = getSecret();
  if (!secret) throw new Error("PAYSTACK_SECRET_KEY is not configured");

  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${secret}`,
      },
    }
  );

  const data = await res.json();
  if (!data.status) {
    throw new Error(data.message || "Verification failed");
  }

  return data.data as {
    id: number;
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata: Record<string, unknown>;
  };
}

export function generateReference(bookingId: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `AB-${bookingId.slice(0, 8)}-${timestamp}-${random}`;
}
