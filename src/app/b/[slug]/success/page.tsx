import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { ReviewForm } from "@/components/booking/review-form";
import { CheckCircle2, Clock, Calendar, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatTime } from "@/lib/utils";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ booking_id?: string }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { booking_id } = await searchParams;

  if (!booking_id) notFound();

  const supabase = createAdminClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .eq("id", booking_id)
    .single();

  if (!booking) notFound();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, primary_color")
    .eq("slug", slug)
    .single();

  if (!business) notFound();

  const isConfirmed =
    booking.status === "confirmed" || booking.payment_status === "paid";

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div
            className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
              isConfirmed ? "bg-emerald-100 dark:bg-emerald-950/40" : "bg-amber-100 dark:bg-amber-950/40"
            }`}
          >
            {isConfirmed ? (
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <h1 className="text-lg font-semibold">
            {isConfirmed ? "Booking confirmed" : "Booking pending"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
              {isConfirmed
                ? `Your appointment with ${business.name} is confirmed.`
              : "You'll receive confirmation shortly."}
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{booking.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{formatDate(booking.booking_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {formatTime(booking.start_time)} — {formatTime(booking.end_time)}
            </span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium">{booking.services?.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deposit</span>
            <span className="font-medium">
              GHS {Number(booking.deposit_amount).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={isConfirmed ? "confirmed" : booking.status} />
          </div>
        </div>

        {/* Review form */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Share your experience</h3>
          <ReviewForm
            businessId={business.id}
            bookingId={booking.id}
            customerName={booking.customer_name}
            customerEmail={booking.customer_email}
            primaryColor={business.primary_color || undefined}
          />
        </div>

        <Button asChild variant="outline" className="w-full" size="sm">
          <Link href={`/b/${slug}`}>Book another</Link>
        </Button>
      </div>
    </div>
  );
}
