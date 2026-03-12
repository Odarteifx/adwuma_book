"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/hooks/use-business";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimatedCount } from "@/components/dashboard/animated-count";
import { AnalyticsSkeleton } from "@/components/dashboard/skeletons";
import { CalendarCheck, CreditCard, TrendingUp, Bot } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface DailyMetric {
  date: string;
  bookings: number;
  revenue: number;
}

export default function AnalyticsPage() {
  const { business } = useBusiness();
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30");
  const [metrics, setMetrics] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    totalRevenue: 0,
    conversionRate: 0,
    cancellationRate: 0,
    aiChats: 0,
    aiToBooking: 0,
  });
  const [dailyData, setDailyData] = useState<DailyMetric[]>([]);

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    async function load() {
      const supabase = createClient();
      const days = parseInt(range);
      const since = new Date(
        Date.now() - days * 24 * 60 * 60 * 1000
      ).toISOString();

      // Events count
      const { data: events } = await supabase
        .from("analytics_events")
        .select("event_type, created_at")
        .eq("business_id", businessId)
        .gte("created_at", since);

      const eventCounts: Record<string, number> = {};
      (events || []).forEach((e) => {
        eventCounts[e.event_type] = (eventCounts[e.event_type] || 0) + 1;
      });

      // Bookings
      const { data: bookings } = await supabase
        .from("bookings")
        .select("status, booking_date, deposit_amount")
        .eq("business_id", businessId)
        .gte("created_at", since);

      const totalBookings = bookings?.length || 0;
      const confirmed =
        bookings?.filter(
          (b) => b.status === "confirmed" || b.status === "completed"
        ).length || 0;
      const cancelledCount =
        bookings?.filter((b) => b.status === "cancelled").length || 0;

      // Payments
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, created_at")
        .eq("business_id", businessId)
        .eq("status", "success")
        .gte("created_at", since);

      const totalRevenue = (payments || []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      // Build daily data
      const dailyMap = new Map<string, DailyMetric>();
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split("T")[0];
        dailyMap.set(key, { date: key, bookings: 0, revenue: 0 });
      }

      (bookings || []).forEach((b) => {
        const d = dailyMap.get(b.booking_date);
        if (d) d.bookings++;
      });

      (payments || []).forEach((p) => {
        const day = p.created_at.split("T")[0];
        const d = dailyMap.get(day);
        if (d) d.revenue += Number(p.amount);
      });

      if (!cancelled) {
        setDailyData(Array.from(dailyMap.values()));
        setMetrics({
          totalBookings,
          confirmedBookings: confirmed,
          totalRevenue,
          conversionRate:
            totalBookings > 0 ? Math.round((confirmed / totalBookings) * 100) : 0,
          cancellationRate:
            totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0,
          aiChats: eventCounts["ai_chat_started"] || 0,
          aiToBooking: eventCounts["ai_chat_to_booking"] || 0,
        });
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business, range]);

  if (!business || loading) {
    return <AnalyticsSkeleton />;
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight sm:text-2xl">Analytics</h2>
          <p className="text-muted-foreground">
            Track your business performance
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Total Bookings
            </CardTitle>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <CalendarCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              <AnimatedCount value={metrics.totalBookings} duration={800} />
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.confirmedBookings} confirmed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">Revenue</CardTitle>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              <AnimatedCount
                value={metrics.totalRevenue}
                duration={800}
                prefix="GHS "
                decimals={2}
              />
            </p>
            <p className="text-xs text-muted-foreground">Deposits collected</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Conversion Rate
            </CardTitle>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              <AnimatedCount
                value={metrics.conversionRate}
                duration={800}
                suffix="%"
              />
            </p>
            <p className="text-xs text-muted-foreground">
              Cancellation: {metrics.cancellationRate}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">
              AI Conversations
            </CardTitle>
            <div className="rounded-lg bg-violet-100 p-2 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
              <Bot className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              <AnimatedCount value={metrics.aiChats} duration={800} />
            </p>
            <p className="text-xs text-muted-foreground">
              {metrics.aiToBooking} led to booking
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bookings Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                bookings: { label: "Bookings", color: "var(--chart-1)" },
                date: { label: "Date" },
              }}
              className="h-56 min-w-0 w-full sm:h-64"
            >
              <LineChart data={dailyData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(v) =>
                        new Date(v).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="var(--color-bookings)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "var(--chart-2)" },
                date: { label: "Date" },
              }}
              className="h-56 min-w-0 w-full sm:h-64"
            >
              <LineChart data={dailyData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      itemFormatter={(value) =>
                        `GHS ${Number(value).toFixed(2)}`
                      }
                    />
                  }
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
