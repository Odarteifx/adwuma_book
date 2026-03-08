"use client";

import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import type { Booking } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { toast } from "sonner";
import { BookingsSkeleton } from "@/components/dashboard/skeletons";
import { formatDate, formatTime } from "@/lib/utils";
import { Eye, CheckCircle, XCircle } from "lucide-react";

type BookingTab = "all" | "active" | "upcoming" | "completed" | "cancelled";

type BookingRow = Booking & { services?: { name: string } };

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

export default function BookingsPage() {
  const { business } = useBusiness();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<BookingTab>("all");
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<BookingRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [firstTimePhones, setFirstTimePhones] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("bookings")
        .select("*, services(name, price)")
        .eq("business_id", businessId)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (cancelled) return;
      const all = (data as BookingRow[]) || [];
      setBookings(all);

      const phoneCounts = new Map<string, number>();
      for (const b of all) {
        phoneCounts.set(b.customer_phone, (phoneCounts.get(b.customer_phone) || 0) + 1);
      }
      const newPhones = new Set<string>();
      for (const [phone, count] of phoneCounts) {
        if (count === 1) newPhones.add(phone);
      }
      setFirstTimePhones(newPhones);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [business, reloadKey]);

  function reload() {
    setReloadKey((k) => k + 1);
  }

  async function updateStatus(bookingId: string, status: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("bookings")
      .update({ status })
      .eq("id", bookingId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Booking ${status}`);
      reload();
      setDetailOpen(false);
    }
  }

  const filtered = useMemo(() => {
    const today = todayStr();
    let list = bookings;

    switch (tab) {
      case "active":
        list = list.filter(
          (b) =>
            b.booking_date === today &&
            (b.status === "confirmed" || b.status === "pending_deposit")
        );
        break;
      case "upcoming":
        list = list.filter(
          (b) =>
            b.booking_date > today &&
            (b.status === "confirmed" || b.status === "pending_deposit")
        );
        break;
      case "completed":
        list = list.filter((b) => b.status === "completed");
        break;
      case "cancelled":
        list = list.filter(
          (b) =>
            b.status === "cancelled" ||
            b.status === "expired" ||
            b.status === "no_show"
        );
        break;
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(
        (b) =>
          b.customer_name.toLowerCase().includes(s) ||
          b.customer_phone.includes(s)
      );
    }

    return list;
  }, [bookings, tab, search]);

  const counts = useMemo(() => {
    const today = todayStr();
    return {
      all: bookings.length,
      active: bookings.filter(
        (b) =>
          b.booking_date === today &&
          (b.status === "confirmed" || b.status === "pending_deposit")
      ).length,
      upcoming: bookings.filter(
        (b) =>
          b.booking_date > today &&
          (b.status === "confirmed" || b.status === "pending_deposit")
      ).length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter(
        (b) =>
          b.status === "cancelled" ||
          b.status === "expired" ||
          b.status === "no_show"
      ).length,
    };
  }, [bookings]);

  const isNewClient = (phone: string) => firstTimePhones.has(phone);

  const columns: ColumnDef<BookingRow>[] = useMemo(
    () => [
      {
        accessorKey: "customer_name",
        header: "Customer",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div>
              <p className="font-medium">{b.customer_name}</p>
              <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "services",
        header: "Service",
        cell: ({ row }) => row.original.services?.name ?? "—",
      },
      {
        accessorKey: "booking_date",
        header: "Date & Time",
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div>
              <p className="text-sm">{formatDate(b.booking_date)}</p>
              <p className="text-xs text-muted-foreground">
                {formatTime(b.start_time)} — {formatTime(b.end_time)}
              </p>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "deposit_amount",
        header: "Deposit",
        cell: ({ row }) =>
          `GHS ${Number(row.original.deposit_amount).toFixed(2)}`,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setSelectedBooking(row.original);
              setDetailOpen(true);
            }}
          >
            <Eye className="h-4 w-4" />
          </Button>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [firstTimePhones]
  );

  if (!business) return <BookingsSkeleton />;

  function tabLabel(label: string, count: number) {
    return (
      <span className="flex items-center gap-1.5">
        {label}
        {count > 0 && (
          <Badge
            variant="secondary"
            className="h-5 min-w-[20px] justify-center px-1.5 text-[10px]"
          >
            {count}
          </Badge>
        )}
      </span>
    );
  }

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-2xl">Bookings</h2>
        <p className="text-muted-foreground">Manage your appointments</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="min-w-0 overflow-x-auto sm:overflow-visible">
        <Tabs value={tab} onValueChange={(v) => setTab(v as BookingTab)} className="shrink-0">
          <TabsList className="inline-flex w-max min-w-0">
            <TabsTrigger value="all">{tabLabel("All", counts.all)}</TabsTrigger>
            <TabsTrigger value="active">{tabLabel("Active", counts.active)}</TabsTrigger>
            <TabsTrigger value="upcoming">{tabLabel("Upcoming", counts.upcoming)}</TabsTrigger>
            <TabsTrigger value="completed">{tabLabel("Done", counts.completed)}</TabsTrigger>
            <TabsTrigger value="cancelled">{tabLabel("Cancelled", counts.cancelled)}</TabsTrigger>
          </TabsList>
        </Tabs>
        </div>
        <Input
          placeholder="Search by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-10 w-full min-w-0 sm:w-48"
        />
      </div>

      {loading ? (
        <BookingsSkeleton />
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {tab === "all"
              ? "No bookings found"
              : tab === "active"
                ? "No bookings for today"
                : tab === "upcoming"
                  ? "No upcoming bookings"
                  : tab === "completed"
                    ? "No completed bookings yet"
                    : "No cancelled bookings"}
          </CardContent>
        </Card>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          rowClassName={(booking) =>
            isNewClient(booking.customer_phone)
              ? "bg-emerald-50/60 dark:bg-emerald-950/10"
              : undefined
          }
          mobileCard={(booking) => (
            <div
              className="cursor-pointer active:bg-muted/40"
              onClick={() => {
                setSelectedBooking(booking);
                setDetailOpen(true);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{booking.customer_name}</p>
                <StatusBadge status={booking.status} />
              </div>
              <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{booking.services?.name} · {formatTime(booking.start_time)}</span>
                <span>{formatDate(booking.booking_date)}</span>
              </div>
            </div>
          )}
        />
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{selectedBooking.customer_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedBooking.customer_phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{formatDate(selectedBooking.booking_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {formatTime(selectedBooking.start_time)} —{" "}
                    {formatTime(selectedBooking.end_time)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <StatusBadge status={selectedBooking.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">Deposit</p>
                  <p className="font-medium">
                    GHS {Number(selectedBooking.deposit_amount).toFixed(2)}
                  </p>
                </div>
                {selectedBooking.notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Notes</p>
                    <p className="font-medium">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>

              {selectedBooking.status === "confirmed" && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    onClick={() =>
                      updateStatus(selectedBooking.id, "completed")
                    }
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() =>
                      updateStatus(selectedBooking.id, "cancelled")
                    }
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
