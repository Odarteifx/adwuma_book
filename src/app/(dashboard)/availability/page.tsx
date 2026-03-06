"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import { DAYS_OF_WEEK } from "@/lib/constants";
import type { Availability, BlockedDate } from "@/types";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { AvailabilitySkeleton } from "@/components/dashboard/skeletons";
import { Loader2, X, CalendarRange } from "lucide-react";
import type { DateRange } from "react-day-picker";

interface DaySchedule {
  day_of_week: number;
  is_active: boolean;
  start_time: string;
  end_time: string;
  id?: string;
}

function formatDateRange(dates: string[]): string {
  if (dates.length === 0) return "";
  if (dates.length === 1) return formatDate(dates[0]);
  return `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`;
}

function groupConsecutiveDates(dates: BlockedDate[]): { dates: BlockedDate[]; label: string }[] {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort((a, b) => a.date.localeCompare(b.date));
  const groups: { dates: BlockedDate[]; label: string }[] = [];
  let current = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].date + "T00:00:00");
    const curr = new Date(sorted[i].date + "T00:00:00");
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      current.push(sorted[i]);
    } else {
      groups.push({
        dates: current,
        label: formatDateRange(current.map((d) => d.date)),
      });
      current = [sorted[i]];
    }
  }
  groups.push({
    dates: current,
    label: formatDateRange(current.map((d) => d.date)),
  });
  return groups;
}

export default function AvailabilityPage() {
  const { business } = useBusiness();
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      is_active: i >= 1 && i <= 5,
      start_time: "09:00",
      end_time: "17:00",
    }))
  );
  const [slotInterval, setSlotInterval] = useState(30);
  const [maxBookingsPerSlot, setMaxBookingsPerSlot] = useState(1);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [blocking, setBlocking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    const slotIntervalMinutes = business.slot_interval_minutes;
    const maxPerSlot = business.max_bookings_per_slot;
    let cancelled = false;
    async function load() {
      const supabase = createClient();

      const { data: avail } = await supabase
        .from("availability")
        .select("*")
        .eq("business_id", businessId)
        .order("day_of_week");

      if (!cancelled && avail && avail.length > 0) {
        setSchedules(
          Array.from({ length: 7 }, (_, i) => {
            const existing = (avail as Availability[]).find(
              (a) => a.day_of_week === i
            );
            return {
              day_of_week: i,
              is_active: existing?.is_active ?? (i >= 1 && i <= 5),
              start_time: existing?.start_time?.slice(0, 5) ?? "09:00",
              end_time: existing?.end_time?.slice(0, 5) ?? "17:00",
              id: existing?.id,
            };
          })
        );
      }

      if (!cancelled) {
        setSlotInterval(slotIntervalMinutes);
        setMaxBookingsPerSlot(maxPerSlot ?? 1);
      }

      const { data: blocked } = await supabase
        .from("blocked_dates")
        .select("*")
        .eq("business_id", businessId)
        .order("date");

      if (!cancelled) {
        setBlockedDates((blocked as BlockedDate[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business]);

  async function handleSave() {
    if (!business) return;
    setSaving(true);
    const supabase = createClient();

    await supabase
      .from("businesses")
      .update({
        slot_interval_minutes: slotInterval,
        max_bookings_per_slot: maxBookingsPerSlot,
      })
      .eq("id", business.id);

    // Upsert availability for each day
    const updatedSchedules = [...schedules];
    for (let i = 0; i < schedules.length; i++) {
      const sched = schedules[i];
      if (sched.id) {
        await supabase
          .from("availability")
          .update({
            is_active: sched.is_active,
            start_time: sched.start_time,
            end_time: sched.end_time,
          })
          .eq("id", sched.id);
      } else {
        const { data } = await supabase
          .from("availability")
          .insert({
            business_id: business.id,
            day_of_week: sched.day_of_week,
            is_active: sched.is_active,
            start_time: sched.start_time,
            end_time: sched.end_time,
          })
          .select()
          .single();
        if (data) {
          updatedSchedules[i] = { ...sched, id: data.id };
        }
      }
    }
    setSchedules(updatedSchedules);

    toast.success("Availability saved");
    setSaving(false);
  }

  async function handleBlockRange() {
    if (!business || !dateRange?.from) return;
    const from = dateRange.from;
    const to = dateRange.to || from;

    const datesToBlock: string[] = [];
    const current = new Date(from);
    const end = new Date(to);
    const existingSet = new Set(blockedDates.map((b) => b.date));

    while (current <= end) {
      const ds = current.toISOString().split("T")[0];
      if (!existingSet.has(ds)) {
        datesToBlock.push(ds);
      }
      current.setDate(current.getDate() + 1);
    }

    if (datesToBlock.length === 0) {
      toast.info("Selected dates are already blocked");
      return;
    }

    setBlocking(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("blocked_dates")
      .insert(datesToBlock.map((d) => ({ business_id: business.id, date: d })))
      .select();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setBlockedDates([...blockedDates, ...(data as BlockedDate[])]);
      const count = data.length;
      toast.success(
        count === 1 ? "1 date blocked" : `${count} dates blocked`
      );
      setDateRange(undefined);
    }
    setBlocking(false);
  }

  async function handleUnblockGroup(ids: string[]) {
    const supabase = createClient();
    await supabase.from("blocked_dates").delete().in("id", ids);
    const idSet = new Set(ids);
    setBlockedDates(blockedDates.filter((b) => !idSet.has(b.id)));
    toast.success(ids.length === 1 ? "Date unblocked" : `${ids.length} dates unblocked`);
  }

  function updateSchedule(index: number, updates: Partial<DaySchedule>) {
    setSchedules(
      schedules.map((s, i) => (i === index ? { ...s, ...updates } : s))
    );
  }

  if (!business || loading) {
    return <AvailabilitySkeleton />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Availability</h2>
        <p className="text-sm text-muted-foreground">
          Set your working hours and block off dates
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Booking Settings</CardTitle>
          <CardDescription>
            Control how your time slots and capacity work
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Slot interval</Label>
            <Select
              value={String(slotInterval)}
              onValueChange={(v) => setSlotInterval(parseInt(v))}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 15, 20, 30, 45, 60, 90, 120].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} minutes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How frequently time slots appear on your booking page.
            </p>
          </div>
          <Separator />
          <div className="space-y-2">
            <Label>Max bookings per time slot</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={100}
                value={maxBookingsPerSlot}
                onChange={(e) =>
                  setMaxBookingsPerSlot(
                    Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                  )
                }
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {maxBookingsPerSlot === 1
                  ? "One booking at a time"
                  : `Up to ${maxBookingsPerSlot} simultaneous bookings`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Set this to the number of clients you can serve at the same time
              (e.g. 3 for a salon with 3 chairs). When a time slot reaches its
              limit, it automatically shows as full.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Working Hours</CardTitle>
          <CardDescription>
            Set your available hours for each day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {schedules.map((sched, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-24">
                <Label className="text-sm font-medium">
                  {DAYS_OF_WEEK[sched.day_of_week]}
                </Label>
              </div>
              <Switch
                checked={sched.is_active}
                onCheckedChange={(checked) =>
                  updateSchedule(i, { is_active: checked })
                }
              />
              {sched.is_active && (
                <>
                  <Input
                    type="time"
                    value={sched.start_time}
                    onChange={(e) =>
                      updateSchedule(i, { start_time: e.target.value })
                    }
                    className="w-32"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="time"
                    value={sched.end_time}
                    onChange={(e) =>
                      updateSchedule(i, { end_time: e.target.value })
                    }
                    className="w-32"
                  />
                </>
              )}
              {!sched.is_active && (
                <span className="text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Availability
      </Button>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Blocked Dates</CardTitle>
          <CardDescription>
            Block specific dates or date ranges when you&apos;re unavailable.
            Select a single date or click two dates to block a range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={setDateRange}
            disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
            modifiers={{
              blocked: (d) => {
                const ds = d.toISOString().split("T")[0];
                return blockedDates.some((b) => b.date === ds);
              },
            }}
            modifiersClassNames={{
              blocked:
                "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-medium",
            }}
            className="rounded-md border"
          />

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-block h-3 w-3 rounded-sm bg-red-100 dark:bg-red-950/40" />
              <span>Blocked</span>
            </div>
          </div>

          {dateRange?.from && (
            <div className="flex items-center gap-2">
              <Button
                onClick={handleBlockRange}
                disabled={blocking}
                size="sm"
              >
                {blocking && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                <CalendarRange className="mr-2 h-3.5 w-3.5" />
                {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime()
                  ? `Block ${formatDate(dateRange.from.toISOString().split("T")[0])} — ${formatDate(dateRange.to.toISOString().split("T")[0])}`
                  : `Block ${formatDate(dateRange.from.toISOString().split("T")[0])}`}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange(undefined)}
              >
                Cancel
              </Button>
            </div>
          )}

          {blockedDates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">
                Blocked dates ({blockedDates.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {groupConsecutiveDates(blockedDates).map((group, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="gap-1.5 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400"
                  >
                    {group.dates.length > 1 && (
                      <CalendarRange className="h-3 w-3" />
                    )}
                    {group.label}
                    <button
                      onClick={() =>
                        handleUnblockGroup(group.dates.map((d) => d.id))
                      }
                      className="ml-0.5 rounded-full p-0.5 hover:bg-red-200 dark:hover:bg-red-900/50"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
