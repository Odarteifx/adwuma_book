"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDate } from "@/lib/utils";
import { CreditCard, TrendingUp, Calendar, Copy, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type PaymentRow = Payment & {
  bookings?: {
    customer_name: string;
    booking_date: string;
    services?: { name: string };
  };
};

type TransactionDetails = {
  reference: string;
  amount: number;
  currency: string;
  channel?: string;
  payment_method?: string;
  paid_at?: string;
  created_at?: string;
  authorization?: { card_type?: string; last4?: string; bank?: string };
};

type PaymentStatusFilter = "all" | "success" | "pending" | "failed";

export default function PaymentsPage() {
  const { business } = useBusiness();
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

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

  const filteredPayments = useMemo(() => {
    let list = payments;
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status === statusFilter);
    }
    if (dateFrom) {
      list = list.filter((p) => p.created_at.split("T")[0] >= dateFrom);
    }
    if (dateTo) {
      list = list.filter((p) => p.created_at.split("T")[0] <= dateTo);
    }
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.bookings?.customer_name?.toLowerCase().includes(s) ||
          p.paystack_reference.toLowerCase().includes(s)
      );
    }
    return list;
  }, [payments, statusFilter, dateFrom, dateTo, search]);

  const handleRowClick = useCallback(async (payment: PaymentRow) => {
    setSelectedPayment(payment);
    setTransactionDetails(null);
    setDetailsLoading(true);
    try {
      const res = await fetch(
        `/api/payments/details?reference=${encodeURIComponent(payment.paystack_reference)}`
      );
      const data = await res.json();
      if (res.ok) {
        setTransactionDetails(data);
      }
    } catch {
      toast.error("Failed to load transaction details");
    } finally {
      setDetailsLoading(false);
    }
  }, []);

  const handleCopyReference = useCallback((e: React.MouseEvent, ref: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(ref);
    toast.success("Reference copied to clipboard");
  }, []);

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
        cell: ({ row }) => {
          const ref = row.original.paystack_reference;
          return (
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs">
                  {ref.length > 20 ? `${ref.slice(0, 20)}…` : ref}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => handleCopyReference(e, ref)}
                  title="Copy reference"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.created_at.split("T")[0]),
      },
    ],
    [handleCopyReference]
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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px] max-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Customer or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 min-h-[36px] pl-8 text-sm leading-none"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as PaymentStatusFilter)}>
          <SelectTrigger className="h-9 min-h-[36px] w-[140px] gap-1 rounded-md border border-input bg-background pl-3 pr-2 text-sm leading-none">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-9 min-h-[36px] w-[140px] rounded-md border border-input bg-background px-3 text-sm leading-none [&::-webkit-calendar-picker-indicator]:opacity-60"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-9 min-h-[36px] w-[140px] rounded-md border border-input bg-background px-3 text-sm leading-none [&::-webkit-calendar-picker-indicator]:opacity-60"
        />
        {(dateFrom || dateTo || statusFilter !== "all" || search.trim()) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 min-h-[36px] text-xs"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setStatusFilter("all");
              setSearch("");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {loading ? (
        <PaymentsSkeleton />
      ) : payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payments yet
          </CardContent>
        </Card>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No payments match your filters
          </CardContent>
        </Card>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={filteredPayments}
            onRowClick={handleRowClick}
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

          <Dialog
            open={!!selectedPayment}
            onOpenChange={(open) => !open && setSelectedPayment(null)}
          >
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Transaction details</DialogTitle>
              </DialogHeader>
              {selectedPayment && (
                <div className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Customer</span>
                      <span>{selectedPayment.bookings?.customer_name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service</span>
                      <span>{selectedPayment.bookings?.services?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-medium">
                        GHS {Number(selectedPayment.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Status</span>
                      <StatusBadge status={selectedPayment.status} />
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-muted-foreground">Reference</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs truncate max-w-[140px]">
                          {selectedPayment.paystack_reference}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) =>
                            handleCopyReference(e, selectedPayment.paystack_reference)
                          }
                          title="Copy reference"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>
                        {formatDate(selectedPayment.created_at.split("T")[0])}
                      </span>
                    </div>
                  </div>

                  {detailsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading payment method…
                    </div>
                  ) : transactionDetails ? (
                    <div className="rounded-lg border p-3 space-y-2 text-sm">
                      <p className="font-medium">Payment method</p>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Channel</span>
                        <span>{transactionDetails.payment_method || transactionDetails.channel || "—"}</span>
                      </div>
                      {transactionDetails.authorization?.card_type && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Card type</span>
                          <span>{transactionDetails.authorization.card_type}</span>
                        </div>
                      )}
                      {transactionDetails.authorization?.last4 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Last 4 digits</span>
                          <span>•••• {transactionDetails.authorization.last4}</span>
                        </div>
                      )}
                      {transactionDetails.authorization?.bank && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bank</span>
                          <span>{transactionDetails.authorization.bank}</span>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
