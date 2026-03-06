"use client";

import { useState, useEffect, useCallback } from "react";
import type { TimeSlot } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  serviceDuration: number;
  onSelect: (date: string, slot: TimeSlot) => void;
}

export function DateTimePicker({ businessId, serviceDuration, onSelect }: Props) {
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
    <div className="space-y-6">
      <div>
        <h2 className="mb-3 text-lg font-semibold">Pick a date</h2>
        <div className="relative">
        {loadingAvailability && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/60">
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
            blocked: "line-through bg-red-50 text-red-300 dark:bg-red-950/20 dark:text-red-800",
          }}
          className="rounded-md border"
        />
        </div>
        {(fullDates.size > 0 || blockedDates.size > 0) && (
          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            {fullDates.size > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-muted-foreground/20" />
                <span>Fully booked</span>
              </div>
            )}
            {blockedDates.size > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-sm bg-red-100 dark:bg-red-950/30" />
                <span>Unavailable</span>
              </div>
            )}
          </div>
        )}
      </div>

      {date && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Pick a time</h2>
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-md" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No available slots for this date.
            </p>
          ) : allSlotsUnavailable ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <Badge
                variant="secondary"
                className="bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              >
                Fully booked
              </Badge>
              <p className="text-sm text-muted-foreground">
                All time slots for this date are at capacity. Please pick
                another date.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((slot) => (
                <Button
                  key={slot.time}
                  variant="outline"
                  size="sm"
                  disabled={!slot.available}
                  className={cn(
                    "text-sm",
                    !slot.available && "opacity-40 line-through"
                  )}
                  onClick={() => onSelect(dateStr, slot)}
                >
                  {slot.time}
                </Button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
