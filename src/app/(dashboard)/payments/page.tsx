"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import type { Payment } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaymentsSkeleton } from "@/components/dashboard/skeletons";
import { CreditCard, TrendingUp, Calendar } from "lucide-react";

export default function PaymentsPage() {
  const { business } = useBusiness();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("payments")
        .select("*, bookings(customer_name, booking_date, services(name))")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setPayments((data as Payment[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business]);

  const successPayments = payments.filter((p) => p.status === "success");
  const totalRevenue = successPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  const today = new Date().toISOString().split("T")[0];
  const todayRevenue = successPayments
    .filter((p) => p.created_at.startsWith(today))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthRevenue = successPayments
    .filter((p) => p.created_at.startsWith(thisMonth))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  if (!business) {
    return <PaymentsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Payments</h2>
        <p className="text-muted-foreground">
          Track deposits and revenue
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GHS {totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GHS {monthRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">GHS {todayRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <PaymentsSkeleton />
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payments yet
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => {
                  const booking = payment as Payment & {
                    bookings?: {
                      customer_name: string;
                      booking_date: string;
                      services?: { name: string };
                    };
                  };
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {booking.bookings?.customer_name || "—"}
                      </TableCell>
                      <TableCell>
                        {booking.bookings?.services?.name || "—"}
                      </TableCell>
                      <TableCell>
                        GHS {Number(payment.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status} />
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {payment.paystack_reference.slice(0, 20)}...
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
