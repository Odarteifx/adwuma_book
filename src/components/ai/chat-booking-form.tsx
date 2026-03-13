"use client";

import { useState, useEffect } from "react";
import type { Service, TimeSlot } from "@/types";
import { customerDetailsSchema, type CustomerDetailsInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { cn, formatTime } from "@/lib/utils";

interface Props {
  businessId: string;
  businessSlug: string;
  services: Service[];
  primaryColor?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ChatBookingForm({
  businessId,
  businessSlug,
  services,
  primaryColor,
  onSuccess,
  onCancel,
}: Props) {
  const [date, setDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [fullDates, setFullDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  const serviceDuration = services.reduce((s, x) => s + x.duration_minutes, 0);

  const form = useForm<CustomerDetailsInput>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "+233",
      notes: "",
    },
  });

  // Fetch availability for next 14 days
  useEffect(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + 14);
    const startStr = today.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    fetch(
      `/api/slots/availability?businessId=${businessId}&duration=${serviceDuration}&startDate=${startStr}&endDate=${endStr}`
    )
      .then((r) => r.json())
      .then((d) => {
        setFullDates(d.fullDates || []);
        setBlockedDates(d.blockedDates || []);
      })
      .catch(() => {});
  }, [businessId, serviceDuration]);

  // Fetch slots when date changes
  useEffect(() => {
    if (!date) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    fetch(
      `/api/slots?businessId=${businessId}&date=${date}&duration=${serviceDuration}`
    )
      .then((r) => r.json())
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [date, businessId, serviceDuration]);

  const todayStr = new Date().toISOString().split("T")[0];
  const minDate = todayStr;
  const availableSlots = slots.filter((s) => s.available);

  async function onSubmit(values: CustomerDetailsInput) {
    const time = availableSlots.find((s) => s.time === selectedSlot)?.time;
    if (!time) {
      form.setError("root", { message: "Please select a time slot" });
      return;
    }

    const res = await fetch("/api/bookings/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: businessId,
        service_ids: services.map((s) => s.id),
        booking_date: date,
        start_time: time,
        customer_name: values.customer_name,
        customer_email: values.customer_email || null,
        customer_phone: values.customer_phone,
        notes: null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      form.setError("root", { message: data.error || "Failed to create booking" });
      return;
    }

    const callbackUrl = `${window.location.origin}/b/${businessSlug}/success?booking_id=${data.booking_ids[0]}`;
    const payRes = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_ids: data.booking_ids,
        total_deposit: data.total_deposit,
        email: values.customer_email || `${values.customer_phone.replace(/\D/g, "")}@adwuma.book`,
        callback_url: callbackUrl,
      }),
    });

    const payData = await payRes.json();
    if (!payRes.ok || !payData.authorization_url) {
      form.setError("root", {
        message: payData.error || "Payment setup unavailable. Please contact the business.",
      });
      return;
    }

    window.location.href = payData.authorization_url;
    onSuccess?.();
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3 rounded-xl border border-border/60 bg-card p-3 text-sm"
      >
        <p className="text-xs font-medium text-muted-foreground">Quick book</p>

        <div>
          <p className="mb-1 text-xs text-muted-foreground">Service</p>
          <p className="rounded-md bg-muted px-2 py-1.5 text-sm font-medium">
            {services.map((s) => s.name).join(", ")}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setSelectedSlot("");
            }}
            min={minDate}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
          />
        </div>

        {date && (
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Time</label>
            {loadingSlots ? (
              <div className="flex h-9 items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-xs text-muted-foreground">No slots available</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedSlot(slot.time)}
                    className={cn(
                      "rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                      selectedSlot === slot.time
                        ? "border-transparent text-white"
                        : "border-border bg-background hover:bg-muted"
                    )}
                    style={
                      selectedSlot === slot.time && primaryColor
                        ? { backgroundColor: primaryColor }
                        : undefined
                    }
                  >
                    {formatTime(slot.time)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <FormField
          control={form.control}
          name="customer_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Your name"
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Phone</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="+233..."
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customer_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs">Email (optional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="you@example.com"
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        {form.formState.errors.root && (
          <p className="text-xs text-destructive">
            {form.formState.errors.root.message}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-xs"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            size="sm"
            disabled={form.formState.isSubmitting}
            className="h-8 flex-1 text-xs text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {form.formState.isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              "Proceed to payment"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
