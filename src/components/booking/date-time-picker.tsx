"use client";

import { useState, useEffect, useCallback } from "react";
import type { Business, Service, TimeSlot } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ServicesSummaryCard } from "./service-summary-card";
import { cn, formatTime } from "@/lib/utils";

interface Props {
  business: Business;
  services: Service[];
  selectedService?: Service | null;
  onAddToCart?: () => void;
  onSelect: (date: string, slot: TimeSlot) => void;
  primaryColor?: string;
}

export function DateTimePicker({
  business,
  services,
  selectedService,
  onAddToCart,
  onSelect,
  primaryColor,
}: Props) {
  const businessId = business.id;
  const serviceDuration = services.reduce((sum, s) => sum + s.duration_minutes, 0);
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

  const [pickedSlot, setPickedSlot] = useState<TimeSlot | null>(null);
  const dateStr = date ? date.toISOString().split("T")[0] : "";

  const allSlotsUnavailable =
    slots.length > 0 && slots.every((s) => !s.available);

  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="border-b border-border/60 bg-card px-4 py-3 sm:px-6 sm:py-4">
        <h3 className="text-base font-medium">Date & time</h3>
      </div>
      <div className="bg-card px-4 pb-4 sm:px-6 sm:pb-6 pt-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 md:items-stretch">
          {/* Row 1: Card and calendar same height */}
          <div className="order-2 min-w-0 md:order-1">
            <ServicesSummaryCard business={business} services={services} />
          </div>
          <div className="order-1 flex min-w-0 flex-col md:order-2">
            <p className="mb-2 text-xs text-muted-foreground">Date</p>
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
                onSelect={(d) => {
                  setDate(d);
                  setPickedSlot(null);
                }}
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
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
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
            <div className="border-t border-border/60 pt-4 md:col-span-2 md:pt-6">
              <p className="mb-2 text-xs text-muted-foreground">Time</p>
              {loadingSlots ? (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-9 w-full rounded-md" />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No available slots for this date.
                </p>
              ) : allSlotsUnavailable ? (
                <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                  No slots for this date
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-2.5 md:grid-cols-5">
                    {slots.map((slot) => (
                      <Button
                        key={slot.time}
                        variant="outline"
                        size="sm"
                        disabled={!slot.available}
                        className={cn(
                          "min-h-[44px] sm:min-h-9",
                          "bg-background text-sm font-normal",
                          !slot.available && "opacity-40 line-through",
                          pickedSlot?.time === slot.time && "ring-2 ring-offset-2",
                          pickedSlot?.time === slot.time &&
                            primaryColor &&
                            "ring-[var(--calendar-brand)]"
                        )}
                        style={
                          pickedSlot?.time === slot.time && primaryColor
                            ? ({ "--calendar-brand": primaryColor } as React.CSSProperties)
                            : undefined
                        }
                        onClick={() =>
                          setPickedSlot((prev) =>
                            prev?.time === slot.time ? null : slot
                          )
                        }
                      >
                        {formatTime(slot.time)}
                      </Button>
                    ))}
                  </div>
                  {pickedSlot && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      {selectedService && onAddToCart && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="min-h-[44px] w-full sm:w-auto sm:min-h-9"
                          style={
                            primaryColor
                              ? {
                                  borderColor: primaryColor,
                                  color: primaryColor,
                                }
                              : undefined
                          }
                          onClick={onAddToCart}
                        >
                          Add to cart
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="min-h-[44px] w-full sm:w-auto sm:min-h-9"
                        style={
                          primaryColor
                            ? {
                                backgroundColor: primaryColor,
                                color: "white",
                                borderColor: primaryColor,
                              }
                            : undefined
                        }
                        onClick={() => onSelect(dateStr, pickedSlot)}
                      >
                        Proceed to details
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
