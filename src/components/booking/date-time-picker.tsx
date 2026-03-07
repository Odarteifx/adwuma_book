"use client";

import { useState, useEffect, useCallback } from "react";
import type { Business, Service, TimeSlot } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ServiceSummaryCard } from "./service-summary-card";
import { cn, formatTime } from "@/lib/utils";

interface Props {
  business: Business;
  service: Service;
  onSelect: (date: string, slot: TimeSlot) => void;
  primaryColor?: string;
}

export function DateTimePicker({ business, service, onSelect, primaryColor }: Props) {
  const businessId = business.id;
  const serviceDuration = service.duration_minutes;
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [month, setMonth] = useState<Date>(new Date());
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [fullDates, setFullDates] = useState<Set<string>>(new Set());
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const unavailableDates = new Set([...fullDates, ...blockedDates]);

  const fetchMonthAvailability = useCallback(
    async (visibleMonth: Date) => {
      setLoadingAvailability(true);
      const year = visibleMonth.getFullYear();
      const mo = visibleMonth.getMonth();
      const startDate = new Date(year, mo, 1);
      const endDate = new Date(year, mo + 1, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (startDate < today) startDate.setTime(today.getTime());
      if (endDate < today) {
        setFullDates(new Set());
        setBlockedDates(new Set());
        setLoadingAvailability(false);
        return;
      }

      const startStr = startDate.toISOString().split("T")[0];
      const endStr = endDate.toISOString().split("T")[0];

      try {
        const res = await fetch(
          `/api/slots/availability?businessId=${businessId}&duration=${serviceDuration}&startDate=${startStr}&endDate=${endStr}`
        );
        const data = await res.json();
        setFullDates(new Set(data.fullDates || []));
        setBlockedDates(new Set(data.blockedDates || []));
      } catch {
        setFullDates(new Set());
        setBlockedDates(new Set());
      } finally {
        setLoadingAvailability(false);
      }
    },
    [businessId, serviceDuration]
  );

  useEffect(() => {
    fetchMonthAvailability(month);
  }, [month, fetchMonthAvailability]);

  useEffect(() => {
    if (!date) return;

    async function fetchSlots() {
      setLoadingSlots(true);
      const dateStr = date!.toISOString().split("T")[0];
      const res = await fetch(
        `/api/slots?businessId=${businessId}&date=${dateStr}&duration=${serviceDuration}`
      );
      const data = await res.json();
      setSlots(data);
      setLoadingSlots(false);
    }

    fetchSlots();
  }, [date, businessId, serviceDuration]);

  const dateStr = date ? date.toISOString().split("T")[0] : "";

  const allSlotsUnavailable =
    slots.length > 0 && slots.every((s) => !s.available);

  return (
    <Card className="overflow-hidden border shadow-sm">
      <CardHeader className="space-y-1.5 px-6 pb-6 pt-6 sm:px-8 sm:pt-8">
        <CardTitle className="text-lg font-semibold tracking-tight">Pick date & time</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Select your preferred date and time slot
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 sm:px-8 sm:pb-8 pt-0">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-stretch">
          {/* Row 1: Card and calendar same height */}
          <div className="order-2 min-w-0 md:order-1">
            <ServiceSummaryCard business={business} service={service} />
          </div>
          <div className="order-1 flex min-w-0 flex-col md:order-2">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Date
            </p>
            <div
              className="relative w-full max-w-full flex-1"
              style={
                primaryColor
                  ? ({ "--calendar-brand": primaryColor } as React.CSSProperties)
                  : undefined
              }
            >
              {loadingAvailability && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
                  <div className="space-y-2">
                    <Skeleton className="mx-auto h-4 w-32" />
                    <Skeleton className="mx-auto h-4 w-24" />
                  </div>
                </div>
              )}
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                month={month}
                onMonthChange={setMonth}
                disabled={(d) => {
                  if (d < new Date(new Date().setHours(0, 0, 0, 0))) return true;
                  const ds = d.toISOString().split("T")[0];
                  return unavailableDates.has(ds);
                }}
                modifiers={{
                  full: (d) => {
                    const ds = d.toISOString().split("T")[0];
                    return fullDates.has(ds);
                  },
                  blocked: (d) => {
                    const ds = d.toISOString().split("T")[0];
                    return blockedDates.has(ds);
                  },
                }}
                modifiersClassNames={{
                  full: "line-through text-muted-foreground/50",
                  blocked:
                    "line-through bg-red-50 text-red-300 dark:bg-red-950/20 dark:text-red-800",
                }}
                className={cn(
                  "w-full max-w-full rounded-lg border [--cell-size:clamp(1.75rem,5vw,2.75rem)] sm:[--cell-size:clamp(2rem,6vw,2.75rem)]",
                  primaryColor &&
                    "[&_button[data-selected-single=true]]:!bg-[var(--calendar-brand)] [&_button[data-selected-single=true]]:!text-white"
                )}
              />
            </div>
            {(fullDates.size > 0 || blockedDates.size > 0) && (
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                {fullDates.size > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    Fully booked
                  </span>
                )}
                {blockedDates.size > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-red-200 dark:bg-red-900/50" />
                    Unavailable
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Row 2: Time picker underneath */}
          {date && (
            <div className="border-t pt-6 md:col-span-2 md:pt-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Time
              </p>
              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No available slots for this date.
                </p>
              ) : allSlotsUnavailable ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 py-6 text-center text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-200">
                  Fully booked. Please pick another date.
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                  {slots.map((slot) => (
                    <Button
                      key={slot.time}
                      variant="outline"
                      size="sm"
                      disabled={!slot.available}
                      className={cn(
                        "min-h-9",
                        "bg-background text-sm font-normal",
                        !slot.available && "opacity-40 line-through"
                      )}
                      onClick={() => onSelect(dateStr, slot)}
                    >
                      {formatTime(slot.time)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
