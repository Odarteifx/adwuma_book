"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Business, Service, TimeSlot } from "@/types";
import { customerDetailsSchema, type CustomerDetailsInput } from "@/lib/validations";
import { RESERVATION_EXPIRY_MINUTES } from "@/lib/constants";
import { formatDate, formatTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ServicesSummaryCard } from "./service-summary-card";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";

interface Props {
  business: Business;
  services: Service[];
  date: string;
  slot: TimeSlot;
  primaryColor?: string;
}

export function CustomerForm({ business, services, date, slot, primaryColor }: Props) {
  const router = useRouter();

  const form = useForm<CustomerDetailsInput>({
    resolver: zodResolver(customerDetailsSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "+233",
      notes: "",
    },
  });

  const totalDeposit = services.reduce((sum, s) => {
    const d =
      s.deposit_type === "percentage"
        ? (Number(s.price) * Number(s.deposit_value)) / 100
        : Number(s.deposit_value);
    return sum + d;
  }, 0);

  async function onSubmit(values: CustomerDetailsInput) {
    const serviceIds = services.map((s) => s.id);

    const res = await fetch("/api/bookings/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: business.id,
        service_ids: serviceIds,
        booking_date: date,
        start_time: slot.time,
        customer_name: values.customer_name,
        customer_email: values.customer_email || null,
        customer_phone: values.customer_phone,
        notes: values.notes || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || "Failed to create booking");
      return;
    }

    const firstBookingId = data.booking_ids[0];
    const callbackUrl =
      data.booking_ids.length > 1
        ? `${window.location.origin}/b/${business.slug}/success?booking_id=${firstBookingId}&booking_ids=${data.booking_ids.join(",")}`
        : `${window.location.origin}/b/${business.slug}/success?booking_id=${firstBookingId}`;

    const payRes = await fetch("/api/payments/initialize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_ids: data.booking_ids,
        total_deposit: data.total_deposit,
        email: values.customer_email || `${values.customer_phone}@adwumabook.com`,
        callback_url: callbackUrl,
      }),
    });

    const payData = await payRes.json();

    if (!payRes.ok) {
      toast.error(payData.error || "Failed to initialize payment");
      return;
    }

    if (payData.authorization_url) {
      window.location.href = payData.authorization_url;
    } else {
      router.push(`/b/${business.slug}/success?booking_id=${firstBookingId}`);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="border-b border-border/60 bg-card px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="text-base font-medium">Your details</h3>
      </div>
      <div className="bg-card px-4 pb-4 sm:px-6 sm:pb-6 pt-4">
        <div className="grid min-h-0 gap-4 md:grid-cols-[minmax(180px,1fr)_minmax(0,1.5fr)] md:gap-6 md:items-stretch">
          <div className="order-2 min-w-0 md:order-1 md:min-h-0">
            <ServicesSummaryCard
              business={business}
              services={services}
              selectedDate={formatDate(date)}
              selectedTime={formatTime(slot.time)}
            />
          </div>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex min-w-0 flex-col space-y-4 lg:min-h-0 lg:overflow-auto"
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm text-muted-foreground">Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kwame Asante"
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_phone"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm text-muted-foreground">Phone</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+233241234567"
                          className="h-9"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm text-muted-foreground">Email (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-9"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm text-muted-foreground">Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Special requests..."
                          rows={2}
                          className="min-h-[60px] resize-none text-sm"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  Deposit · {RESERVATION_EXPIRY_MINUTES} min to pay
                </span>
                <span className="font-medium">GHS {totalDeposit.toFixed(2)}</span>
              </div>

              <Button
                type="submit"
                className="h-10 w-full"
                disabled={form.formState.isSubmitting}
                style={
                  primaryColor
                    ? {
                        backgroundColor: primaryColor,
                        color: "white",
                        borderColor: primaryColor,
                      }
                    : undefined
                }
              >
                {form.formState.isSubmitting ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Lock className="mr-1.5 h-3.5 w-3.5" />
                )}
                Pay & confirm
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Secure payment by Paystack · Card & mobile money
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
