function clampRating(rating: number): number {
  if (Number.isNaN(rating)) {
    return 0;
  }
  return Math.min(5, Math.max(0, Math.round(rating)));
}

export function formatRatingLabel(rating: number): string {
  const value = clampRating(rating);
  return `${value} out of 5`;
}

export function RatingStars({ rating }: { rating: number }) {
  const value = clampRating(rating);
  const filled = "★".repeat(value);
  const empty = "☆".repeat(5 - value);

  return (
    <span
      className="inline-flex items-center gap-2 text-label text-text"
      aria-label={formatRatingLabel(value)}
    >
      <span className="tracking-wide text-secondary" aria-hidden="true">
        {filled}
        {empty}
      </span>
      <span className="tabular-nums text-text-muted">{value}/5</span>
    </span>
  );
}
