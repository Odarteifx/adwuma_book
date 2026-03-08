"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/use-business";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Star, MessageSquare, TrendingUp } from "lucide-react";
import { AnalyticsSkeleton } from "@/components/dashboard/skeletons";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Review } from "@/types";

function formatReviewDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewsPage() {
  const { business } = useBusiness();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analytics, setAnalytics] = useState<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<number, number>;
    recentTrend: { date: string; average: number | null; count: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!business) return;
    const businessId = business.id;
    let cancelled = false;

    async function load() {
      const [reviewsRes, analyticsRes] = await Promise.all([
        fetch(`/api/reviews?businessId=${businessId}`),
        fetch(`/api/reviews/analytics?businessId=${businessId}`),
      ]);

      const reviewsData = await reviewsRes.json();
      const analyticsData = await analyticsRes.json();

      if (!cancelled) {
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setAnalytics(analyticsData);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [business]);

  if (!business || loading) {
    return <AnalyticsSkeleton />;
  }

  const ratingChartData = analytics
    ? [1, 2, 3, 4, 5].map((r) => ({
        rating: `${r} star${r > 1 ? "s" : ""}`,
        count: analytics.ratingDistribution[r] ?? 0,
      }))
    : [];

  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight sm:text-2xl">Reviews</h2>
        <p className="text-muted-foreground">
          Customer feedback and performance analytics
        </p>
      </div>

      {/* Analytics cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Average Rating
            </CardTitle>
            <div className="rounded-lg bg-amber-100 p-2 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <Star className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              {analytics?.averageRating?.toFixed(1) ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">Out of 5</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">
              Total Reviews
            </CardTitle>
            <div className="rounded-lg bg-blue-100 p-2 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              <MessageSquare className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">{analytics?.totalReviews ?? 0}</p>
            <p className="text-xs text-muted-foreground">Customer feedback</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">5-Star Reviews</CardTitle>
            <div className="rounded-lg bg-emerald-100 p-2 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              {analytics?.ratingDistribution?.[5] ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics?.totalReviews
                ? Math.round(
                    ((analytics.ratingDistribution?.[5] ?? 0) /
                      analytics.totalReviews) *
                      100
                  )
                : 0}
              % of total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium sm:text-sm">1–2 Star</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold sm:text-2xl">
              {(analytics?.ratingDistribution?.[1] ?? 0) +
                (analytics?.ratingDistribution?.[2] ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: { label: "Reviews", color: "var(--chart-4)" },
                rating: { label: "Rating" },
              }}
              className="h-56 min-w-0 w-full sm:h-64"
            >
              <BarChart
                data={ratingChartData}
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="rating"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rating Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                average: { label: "Avg Rating", color: "var(--chart-2)" },
                date: { label: "Date" },
              }}
              className="h-56 min-w-0 w-full sm:h-64"
            >
              <BarChart
                data={
                  analytics?.recentTrend?.filter((d) => d.count > 0) ?? []
                }
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(d) => d.slice(5)}
                />
                <YAxis
                  domain={[0, 5]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      itemFormatter={(value) =>
                        value != null ? Number(value).toFixed(1) : "—"
                      }
                    />
                  }
                />
                <Bar
                  dataKey="average"
                  fill="var(--color-average)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reviews list */}
      <Card>
        <CardHeader>
          <CardTitle>All Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No reviews yet
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-medium">{review.customer_name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatReviewDate(review.created_at)}
                    </span>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
