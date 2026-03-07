"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  businessId: string;
  bookingId: string;
  customerName: string;
  customerEmail?: string;
  primaryColor?: string;
  onSuccess?: () => void;
}

export function ReviewForm({
  businessId,
  bookingId,
  customerName,
  customerEmail,
  primaryColor,
  onSuccess,
}: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          booking_id: bookingId,
          customer_name: customerName,
          customer_email: customerEmail || null,
          rating,
          comment: comment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit");
      setSubmitted(true);
      toast.success("Thank you for your review!");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
          Thank you for your review!
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">How was your experience?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="rounded p-1 transition-transform hover:scale-110"
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  "h-8 w-8 transition-colors",
                  (hoverRating || rating) >= star
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="review-comment" className="mb-2 block text-sm font-medium">
          Comment (optional)
        </label>
        <Textarea
          id="review-comment"
          placeholder="Share your experience..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>
      <Button
        type="submit"
        disabled={submitting || rating < 1}
        className="w-full"
        style={
          primaryColor
            ? { backgroundColor: primaryColor, color: "white" }
            : undefined
        }
      >
        {submitting ? "Submitting..." : "Submit review"}
      </Button>
    </form>
  );
}
