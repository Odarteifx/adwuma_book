"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  reference: string | null;
  isConfirmed: boolean;
}

/**
 * When the user returns from Paystack with ?reference=xxx, verify the payment
 * so the booking is confirmed even if the webhook was skipped or delayed.
 */
export function VerifyPaymentOnReturn({ reference, isConfirmed }: Props) {
  const router = useRouter();
  const verified = useRef(false);

  useEffect(() => {
    if (!reference || isConfirmed || verified.current) return;

    verified.current = true;

    fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference }),
    })
      .then((res) => {
        if (res.ok || res.status === 404) {
          router.refresh();
        }
      })
      .catch(() => {
        verified.current = false;
      });
  }, [reference, isConfirmed, router]);

  return null;
}
