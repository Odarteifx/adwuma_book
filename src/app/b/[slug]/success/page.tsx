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
  searchParams: Promise<{ booking_id?: string; booking_ids?: string }>;
}

export default async function SuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { booking_id, booking_ids } = await searchParams;

  const ids = booking_ids
    ? booking_ids.split(",").filter(Boolean)
    : booking_id
      ? [booking_id]
      : [];

  if (ids.length === 0) notFound();

  const supabase = createAdminClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, services(name)")
    .in("id", ids)
    .order("start_time", { ascending: true });

  if (!bookings || bookings.length === 0) notFound();

  const firstBooking = bookings[0];
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, primary_color")
    .eq("slug", slug)
    .single();

  if (!business) notFound();

  const isConfirmed =
    firstBooking.status === "confirmed" || firstBooking.payment_status === "paid";
  const totalDeposit = bookings.reduce(
    (sum, b) => sum + Number(b.deposit_amount),
    0
  );

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
              ? `Your appointment${bookings.length > 1 ? "s" : ""} with ${business.name} ${bookings.length > 1 ? "are" : "is"} confirmed.`
              : "You'll receive confirmation shortly."}
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{firstBooking.customer_name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{formatDate(firstBooking.booking_date)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span>
              {formatTime(firstBooking.start_time)} —{" "}
              {formatTime(bookings[bookings.length - 1].end_time)}
            </span>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {bookings.length > 1 ? "Services" : "Service"}
              </span>
            </div>
            {bookings.map((b) => (
              <div
                key={b.id}
                className="flex justify-between text-sm"
              >
                <span className="text-muted-foreground">
                  {b.services?.name ?? "Service"}
                </span>
                <span className="font-medium">
                  GHS {Number(b.total_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Deposit</span>
            <span className="font-medium">
              GHS {totalDeposit.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground">Status</span>
            <StatusBadge status={isConfirmed ? "confirmed" : firstBooking.status} />
          </div>
        </div>

        {/* Review form - use first booking */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Share your experience</h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Rate your visit and add an optional comment below.
          </p>
          <ReviewForm
            businessId={business.id}
            bookingId={firstBooking.id}
            customerName={firstBooking.customer_name}
            customerEmail={firstBooking.customer_email}
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
