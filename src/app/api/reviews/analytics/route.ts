import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");

  if (!businessId) {
    return NextResponse.json(
      { error: "businessId is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, created_at")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0) {
    return NextResponse.json({
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      recentTrend: [],
    });
  }

  const totalReviews = reviews.length;
  const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = Math.round((sum / totalReviews) * 10) / 10;

  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    ratingDistribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
  });

  const now = new Date();
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0];
  });

  const reviewsByDate = reviews.reduce<Record<string, { sum: number; count: number }>>(
    (acc, r) => {
      const date = r.created_at.split("T")[0];
      if (!acc[date]) acc[date] = { sum: 0, count: 0 };
      acc[date].sum += r.rating;
      acc[date].count += 1;
      return acc;
    },
    {}
  );

  const recentTrend = last30Days.map((date) => ({
    date,
    average: reviewsByDate[date]
      ? Math.round((reviewsByDate[date].sum / reviewsByDate[date].count) * 10) / 10
      : null,
    count: reviewsByDate[date]?.count ?? 0,
  }));

  return NextResponse.json({
    averageRating,
    totalReviews,
    ratingDistribution,
    recentTrend,
  });
}
