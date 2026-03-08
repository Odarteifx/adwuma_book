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
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="space-y-2 px-4 pb-4 pt-5 sm:px-8 sm:pb-6 sm:pt-8">
        <CardTitle className="text-lg font-semibold tracking-tight">Your details</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your information to complete the booking
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-5 sm:px-8 sm:pb-8 pt-0">
        <div className="grid min-h-0 gap-6 md:grid-cols-[minmax(200px,1fr)_minmax(0,1.5fr)] md:gap-8 md:items-stretch">
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
              className="flex min-w-0 flex-col space-y-6 lg:min-h-0 lg:overflow-auto"
            >
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Full name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Kwame Asante"
                          className="h-11"
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Phone number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="+233241234567"
                          className="h-11"
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Email (optional)</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          className="h-11"
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
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium">Notes (optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any special requests..."
                          rows={3}
                          className="min-h-[80px] resize-none"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Separator className="my-2" />

              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3.5">
                <span className="text-sm text-muted-foreground">
                  Deposit · {RESERVATION_EXPIRY_MINUTES} min to pay
                </span>
                <span className="text-sm font-bold">GHS {totalDeposit.toFixed(2)}</span>
              </div>

              <Button
                type="submit"
                className="h-12 w-full min-h-[48px]"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Pay Deposit & Confirm
              </Button>
            </form>
          </Form>
        </div>
      </CardContent>
    </Card>
  );
}
