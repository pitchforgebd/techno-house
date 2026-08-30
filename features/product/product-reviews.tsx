import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { RatingStars } from "@/features/product/rating-stars";
import type { ProductReview } from "@/lib/data";

type ProductReviewsProps = {
  reviews: ProductReview[];
};

export function ProductReviews({ reviews }: ProductReviewsProps) {
  const average =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
      : 0;

  return (
    <div className="space-y-4">
      <p className="text-caption text-text-muted">
        Reviews below are sample catalog content. Mock reviews you write in your
        account stay on this device and are not published here.
      </p>
      {reviews.length === 0 ? (
        <EmptyState
          title="No reviews yet"
          description="Sample catalog reviews will list here when a product has them. You can save a mock review in your account."
          action={
            <Link
              href="/account/reviews"
              className="text-label font-medium text-primary underline-offset-2 hover:underline"
            >
              Write a mock review
            </Link>
          }
        />
      ) : (
        <>
          <div className="rounded-md border border-border bg-surface-muted/60 px-3 py-2.5">
            <p className="text-label font-medium text-text">
              Average rating · {reviews.length}{" "}
              {reviews.length === 1 ? "review" : "reviews"}
            </p>
            <div className="mt-1">
              <RatingStars rating={Math.round(average)} />
            </div>
          </div>
          <ul className="space-y-3">
            {reviews.map((review) => (
              <li
                key={review.id}
                className="rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars rating={review.rating} />
                  <time
                    dateTime={review.createdAt}
                    className="text-caption text-text-muted"
                  >
                    {review.createdAt}
                  </time>
                </div>
                <h3 className="mt-2 text-label font-semibold text-text">
                  {review.title}
                </h3>
                <p className="mt-1 text-body text-text-muted">{review.body}</p>
                <p className="mt-2 text-caption text-text-muted">
                  {review.authorName}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-caption text-text-muted">
            To practice a review form, use{" "}
            <Link
              href="/account/reviews"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              account reviews
            </Link>
            . Those entries are not shown on this page.
          </p>
        </>
      )}
    </div>
  );
}
