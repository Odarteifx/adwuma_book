import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { CheckCircle2, Clock, Calendar, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
    .select("name, primary_color")
    .eq("slug", slug)
    .single();

  const isConfirmed =
    booking.status === "confirmed" || booking.payment_status === "paid";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            {isConfirmed ? (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            ) : (
              <Clock className="h-8 w-8 text-yellow-600" />
            )}
          </div>
          <CardTitle className="text-xl">
            {isConfirmed ? "Booking Confirmed!" : "Booking Pending"}
          </CardTitle>
          <CardDescription>
            {isConfirmed
              ? `Your appointment with ${business?.name || "the business"} is confirmed.`
              : "Your booking is being processed. You'll receive confirmation shortly."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{booking.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{booking.booking_date}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>
                {booking.start_time?.slice(0, 5)} — {booking.end_time?.slice(0, 5)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Service</span>
              <span className="text-sm font-medium">
                {booking.services?.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Deposit paid
              </span>
              <span className="text-sm font-medium">
                GHS {Number(booking.deposit_amount).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={isConfirmed ? "confirmed" : booking.status} />
            </div>
          </div>

          <Button asChild className="w-full" variant="outline">
            <Link href={`/b/${slug}`}>Book another appointment</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
