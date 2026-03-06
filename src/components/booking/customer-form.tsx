"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Business, Service, TimeSlot } from "@/types";
import { bookingSchema } from "@/lib/validations";
import { RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

interface Props {
  business: Business;
  service: Service;
  date: string;
  slot: TimeSlot;
}

export function CustomerForm({ business, service, date, slot }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "+233",
    notes: "",
  });

  const deposit =
    service.deposit_type === "percentage"
      ? (Number(service.price) * Number(service.deposit_value)) / 100
      : Number(service.deposit_value);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const endMinutes =
      parseInt(slot.time.split(":")[0]) * 60 +
      parseInt(slot.time.split(":")[1]) +
      service.duration_minutes;
    const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;

    const payload = {
      service_id: service.id,
      booking_date: date,
      start_time: slot.time,
      customer_name: form.customer_name,
      customer_email: form.customer_email || null,
      customer_phone: form.customer_phone,
      notes: form.notes || null,
    };

    const parsed = bookingSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setLoading(true);

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        business_id: business.id,
        end_time: endTime,
        deposit_amount: deposit,
        total_price: Number(service.price),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed to create booking");
      setLoading(false);
      return;
    }

    // Initialize payment
    const payRes = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: data.booking.id,
        email: form.customer_email || `${form.customer_phone}@adwumabook.com`,
        callback_url: `${window.location.origin}/b/${business.slug}/success?booking_id=${data.booking.id}`,
      }),
    });

    const payData = await payRes.json();

    if (!payRes.ok) {
      toast.error(payData.error || "Failed to initialize payment");
      setLoading(false);
      return;
    }

    if (payData.authorization_url) {
      window.location.href = payData.authorization_url;
    } else {
      router.push(`/b/${business.slug}/success?booking_id=${data.booking.id}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
        <CardDescription>
          Complete your booking for {service.name} on {date} at {slot.time}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} className="space-y-6">
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              placeholder="Kwame Asante"
              value={form.customer_name}
              onChange={(e) =>
                setForm({ ...form, customer_name: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone number</Label>
            <Input
              id="phone"
              placeholder="+233241234567"
              value={form.customer_phone}
              onChange={(e) =>
                setForm({ ...form, customer_phone: e.target.value })
              }
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.customer_email}
              onChange={(e) =>
                setForm({ ...form, customer_email: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any special requests..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <div className="w-full rounded-lg bg-muted p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Deposit required</span>
              <span className="text-lg font-bold">
                GHS {deposit.toFixed(2)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              You have {RESERVATION_EXPIRY_MINUTES} minutes to complete
              payment after booking.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Pay Deposit & Confirm
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
