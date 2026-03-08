"use client";

import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import type { Payment } from "@/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaymentsSkeleton } from "@/components/dashboard/skeletons";
import { formatDate } from "@/lib/utils";
import { CreditCard, TrendingUp, Calendar } from "lucide-react";

type PaymentRow = Payment & {
  bookings?: {
    customer_name: string;
    booking_date: string;
    services?: { name: string };
  };
};

export default function PaymentsPage() {
  const { business } = useBusiness();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
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
        setPayments((data as PaymentRow[]) || []);
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

  const columns: ColumnDef<PaymentRow>[] = useMemo(
    () => [
      {
        accessorKey: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.bookings?.customer_name || "—"}
          </span>
        ),
      },
      {
        accessorKey: "service",
        header: "Service",
        cell: ({ row }) => row.original.bookings?.services?.name || "—",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        cell: ({ row }) => `GHS ${Number(row.original.amount).toFixed(2)}`,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "paystack_reference",
        header: "Reference",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.paystack_reference.slice(0, 20)}…
          </span>
        ),
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.created_at.split("T")[0]),
      },
    ],
    []
  );

  if (!business) {
    return <PaymentsSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-2xl">Payments</h2>
        <p className="text-muted-foreground">Track deposits and revenue</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Total Revenue</CardTitle>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">GHS {totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">This Month</CardTitle>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">GHS {monthRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Today</CardTitle>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">GHS {todayRevenue.toFixed(2)}</p>
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
        <DataTable
          columns={columns}
          data={payments}
          mobileCard={(payment) => (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">
                  {payment.bookings?.customer_name || "—"}
                </p>
                <StatusBadge status={payment.status} />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>GHS {Number(payment.amount).toFixed(2)} · {payment.bookings?.services?.name || "—"}</span>
                <span>{formatDate(payment.created_at.split("T")[0])}</span>
              </div>
            </div>
          )}
        />
      )}
    </div>
  );
}
