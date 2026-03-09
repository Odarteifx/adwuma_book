"use client";

import { useState, useEffect } from "react";
import type { Business, Review } from "@/types";
import { Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  businessId: string;
  primaryColor?: string;
}

function formatReviewDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString();
}

export function ReviewsSection({ businessId, primaryColor }: Props) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchReviews() {
      const res = await fetch(`/api/reviews?businessId=${businessId}`);
      const data = await res.json();
      if (!cancelled && Array.isArray(data)) setReviews(data);
      setLoading(false);
    }
    fetchReviews();
    return () => { cancelled = true; };
  }, [businessId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <h2 className="text-base font-medium">Reviews</h2>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const averageRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10
        ) / 10
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-medium">Reviews</h2>
        {reviews.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {averageRating} · {reviews.length} review{reviews.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          No reviews yet
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-lg border border-border/60 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          "h-3 w-3",
                          star <= review.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted-foreground/30"
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{review.customer_name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatReviewDate(review.created_at)}
                </span>
              </div>
              {review.comment && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
