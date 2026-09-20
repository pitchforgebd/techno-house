import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

function clampRating(rating: number): number {
  if (Number.isNaN(rating)) {
    return 0;
  }
  return Math.min(5, Math.max(0, rating));
}

export function formatRatingLabel(rating: number): string {
  const value = clampRating(rating);
  return `${Math.round(value)} out of 5`;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <Star
      aria-hidden
      strokeWidth={1.75}
      className={cn(
        "size-4",
        filled ? "fill-secondary text-secondary" : "text-border",
      )}
    />
  );
}

export function RatingStars({
  rating,
  reviewCount,
}: {
  rating: number;
  /** When given, the stars are followed by "N reviews" instead of "x/5" —
   * the count is what a shopper scanning a product page actually weighs. */
  reviewCount?: number;
}) {
  const value = clampRating(rating);
  const fullStars = Math.round(value);

  return (
    <span
      className="inline-flex items-center gap-2 text-label text-text"
      aria-label={formatRatingLabel(value)}
    >
      <span className="inline-flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, index) => (
          <StarIcon key={index} filled={index < fullStars} />
        ))}
      </span>
      <span className="tabular-nums text-text-muted">
        {reviewCount === undefined
          ? `${Math.round(value)}/5`
          : `${reviewCount} ${reviewCount === 1 ? "review" : "reviews"}`}
      </span>
    </span>
  );
}
