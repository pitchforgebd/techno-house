import type { ProductReview } from "@/lib/data";

export function averageProductRating(reviews: ProductReview[]): number {
  if (reviews.length === 0) {
    return 5;
  }
  const sum = reviews.reduce((total, review) => total + review.rating, 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}
