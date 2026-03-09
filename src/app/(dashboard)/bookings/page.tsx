"use client";

import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import type { Booking } from "@/types";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
      setBookings((data as BookingRow[]) || []);
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

  const columns: ColumnDef<BookingRow>[] = useMemo(
    () => [
      {
        accessorKey: "customer_name",
        header: () => <span className="text-muted-foreground font-normal">Customer</span>,
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div>
              <p className="text-sm font-medium">{b.customer_name}</p>
              <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "services",
        header: () => <span className="text-muted-foreground font-normal">Service</span>,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.services?.name ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "booking_date",
        header: () => <span className="text-muted-foreground font-normal">When</span>,
        cell: ({ row }) => {
          const b = row.original;
          return (
            <div className="text-sm">
              <span>{formatDate(b.booking_date)}</span>
              <span className="text-muted-foreground">
                {" · "}{formatTime(b.start_time)}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: () => <span className="text-muted-foreground font-normal">Status</span>,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "deposit_amount",
        header: () => <span className="text-muted-foreground font-normal">Deposit</span>,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            GHS {Number(row.original.deposit_amount).toFixed(2)}
          </span>
        ),
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
    []
  );

  if (!business) return <BookingsSkeleton />;

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium sm:text-lg">Bookings</h2>
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          <Tabs value={tab} onValueChange={(v) => setTab(v as BookingTab)} className="shrink-0">
            <TabsList className="h-9 shrink-0 bg-muted/50">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="active" className="text-xs sm:text-sm">
                Today
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs sm:text-sm">
                Upcoming
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">
                Done
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-xs sm:text-sm">
                Cancelled
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-24 sm:w-32 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <BookingsSkeleton />
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          {tab === "all"
            ? "No bookings"
            : tab === "active"
              ? "Nothing today"
              : tab === "upcoming"
                ? "No upcoming"
                : tab === "completed"
                  ? "None completed"
                  : "None cancelled"}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          mobileCard={(booking) => (
            <div
              className="cursor-pointer active:bg-muted/30"
              onClick={() => {
                setSelectedBooking(booking);
                setDetailOpen(true);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{booking.customer_name}</p>
                <StatusBadge status={booking.status} />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {booking.services?.name} · {formatDate(booking.booking_date)} {formatTime(booking.start_time)}
              </p>
            </div>
          )}
        />
      )}

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">Booking</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Customer</p>
                  <p className="font-medium">{selectedBooking.customer_name}</p>
                  <p className="text-muted-foreground">{selectedBooking.customer_phone}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-muted-foreground text-xs">Date</p>
                    <p className="font-medium">{formatDate(selectedBooking.booking_date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Time</p>
                    <p className="font-medium">
                      {formatTime(selectedBooking.start_time)} — {formatTime(selectedBooking.end_time)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={selectedBooking.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Deposit</span>
                  <span className="font-medium">
                    GHS {Number(selectedBooking.deposit_amount).toFixed(2)}
                  </span>
                </div>
                {selectedBooking.notes && (
                  <div>
                    <p className="text-muted-foreground text-xs">Notes</p>
                    <p className="font-medium">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>

              {selectedBooking.status === "confirmed" && (
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => updateStatus(selectedBooking.id, "completed")}
                  >
                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => updateStatus(selectedBooking.id, "cancelled")}
                  >
                    <XCircle className="mr-1.5 h-3.5 w-3.5" />
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
