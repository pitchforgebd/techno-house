"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import { useMockConversations } from "@/features/account/use-mock-conversations";
import { useMockCustomer } from "@/features/account/use-mock-customer";
import { InteractiveRatingPicker } from "@/features/product/interactive-rating-picker";
import { RatingStars } from "@/features/product/rating-stars";
import {
  REVIEW_BODY_MAX,
  clampRating,
  createMockReviewId,
  reviewTitleFromBody,
  validatePdpReviewInput,
} from "@/lib/account/mock-conversations";
import type { ProductReview } from "@/lib/data";

type ProductReviewsProps = {
  catalogReviews: ProductReview[];
  productSlug: string;
  productName: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProductReviews({
  catalogReviews,
  productSlug,
  productName,
}: ProductReviewsProps) {
  const pathname = usePathname();
  const { session } = useMockCustomer();
  const { reviews: storedReviews, addReview } = useMockConversations();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const customerReviews = useMemo(
    () => storedReviews.filter((item) => item.productSlug === productSlug),
    [storedReviews, productSlug],
  );

  const allReviews = useMemo(() => {
    const mapped = customerReviews.map((item) => ({
      id: item.id,
      rating: item.rating,
      title: item.title,
      body: item.body,
      authorName: item.authorName,
      createdAt: item.createdAt,
      pending: true as const,
    }));
    const catalog = catalogReviews.map((item) => ({
      id: item.id,
      rating: item.rating,
      title: item.title,
      body: item.body,
      authorName: item.authorName,
      createdAt: item.createdAt,
      pending: false as const,
    }));
    return [...mapped, ...catalog];
  }, [catalogReviews, customerReviews]);

  const average =
    allReviews.length > 0
      ? allReviews.reduce((sum, review) => sum + review.rating, 0) /
        allReviews.length
      : 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const nextErrors = validatePdpReviewInput({ rating, body });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    const trimmed = body.trim();
    addReview({
      id: createMockReviewId(),
      productSlug,
      productName,
      authorName: session.fullName,
      rating: clampRating(rating),
      title: reviewTitleFromBody(trimmed),
      body: trimmed,
      createdAt: new Date().toISOString(),
      status: "pending",
    });
    setBody("");
    setRating(0);
    setErrors({});
    notifySuccess({
      title: "Review submitted",
      description: "Your review is saved on this device and shown below.",
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">
          Customer reviews
        </h2>
        <p className="mt-1 text-body text-text-muted">
          {allReviews.length === 0
            ? "No reviews given yet."
            : `${allReviews.length} ${allReviews.length === 1 ? "review" : "reviews"}.`}
        </p>
      </div>

      {allReviews.length > 0 ? (
        <>
          <div className="rounded-md border border-border bg-surface-muted/60 px-3 py-2.5">
            <p className="text-label font-medium text-text">
              Average rating · {allReviews.length}{" "}
              {allReviews.length === 1 ? "review" : "reviews"}
            </p>
            <div className="mt-1">
              <RatingStars rating={average} />
            </div>
          </div>
          <ul className="space-y-3">
            {allReviews.map((review) => (
              <li
                key={review.id}
                className="rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <RatingStars rating={review.rating} />
                  <div className="flex items-center gap-2">
                    {review.pending ? (
                      <Badge tone="neutral">Your review</Badge>
                    ) : null}
                    <time
                      dateTime={review.createdAt}
                      className="text-caption text-text-muted"
                    >
                      {formatWhen(review.createdAt)}
                    </time>
                  </div>
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
        </>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-label font-semibold text-text">Your review</h3>
        {!session ? (
          <p className="text-body text-text-muted">
            <Link
              href={`/account/login?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to submit a review for this product.
          </p>
        ) : (
          <form
            className="space-y-4 border border-border bg-surface px-4 py-4 sm:px-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <Field label="Rating" htmlFor="pdp-review-rating">
              <InteractiveRatingPicker
                value={rating}
                onChange={setRating}
                error={errors.rating}
              />
            </Field>
            <p className="text-caption text-text-muted">
              Signed in as{" "}
              <span className="font-medium text-text">{session.fullName}</span>
            </p>
            <Field label="Review" htmlFor="pdp-review-body" error={errors.body}>
              <Textarea
                id="pdp-review-body"
                value={body}
                placeholder="Review"
                maxLength={REVIEW_BODY_MAX}
                onChange={(event) => setBody(event.target.value)}
                rows={5}
              />
            </Field>
            <Button type="submit" size="sm">
              Submit review
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
