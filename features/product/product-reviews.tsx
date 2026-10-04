"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { createCustomerReviewAction } from "@/features/account/conversation-actions";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import { createGuestReviewAction } from "@/features/product/guest-feedback-actions";
import { HoneypotField } from "@/features/product/honeypot-field";
import { InteractiveRatingPicker } from "@/features/product/interactive-rating-picker";
import { RatingStars } from "@/features/product/rating-stars";
import { validatePdpReviewInput } from "@/lib/account/mock-conversations";
import {
  GUEST_NAME_MAX,
  parseGuestReviewText,
  validateGuestIdentity,
} from "@/lib/catalog/guest-feedback-input";
import { REVIEW_BODY_MAX } from "@/lib/catalog/review-input";
import type { CustomerReviewView } from "@/lib/catalog/review-input";
import type { ProductReview } from "@/lib/data";

type ProductReviewsProps = {
  catalogReviews: ProductReview[];
  ownReviews: CustomerReviewView[];
  productSlug: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProductReviews({
  catalogReviews,
  ownReviews,
  productSlug,
}: ProductReviewsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useCustomerSession();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  // Visitors without an account: a name, a hidden honeypot, and a thank-you note
  // (they have no "my reviews" list to see the pending review in).
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [sentAsGuest, setSentAsGuest] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const allReviews = useMemo(() => {
    const mapped = ownReviews.map((item) => ({
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
  }, [catalogReviews, ownReviews]);

  const published = catalogReviews;
  const average =
    published.length > 0
      ? published.reduce((sum, review) => sum + review.rating, 0) /
        published.length
      : 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validatePdpReviewInput({ rating, body });
    if (!session) {
      Object.assign(nextErrors, validateGuestIdentity({ name }));
      if (!nextErrors.body) {
        const text = parseGuestReviewText(body);
        if (!text.ok) {
          nextErrors.body = text.formError;
        }
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    startTransition(async () => {
      const result = session
        ? await createCustomerReviewAction({
            productSlug,
            rating,
            title: "",
            body,
          })
        : await createGuestReviewAction({
            productSlug,
            rating,
            body,
            name,
            website,
          });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not submit the review.");
        return;
      }
      setBody("");
      setRating(0);
      setErrors({});
      if (session) {
        notifySuccess({
          title: "Review submitted",
          description: "Staff will publish it after moderation.",
        });
        router.refresh();
      } else {
        setSentAsGuest(true);
        notifySuccess({
          title: "Review received",
          description: "Thank you! It will appear once staff approve it.",
        });
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">
          Customer reviews
        </h2>
        <p className="mt-1 text-body text-text-muted">
          {published.length === 0
            ? "No reviews given yet."
            : `${published.length} ${published.length === 1 ? "review" : "reviews"}.`}
        </p>
      </div>

      {allReviews.length > 0 ? (
        <>
          {published.length > 0 ? (
            <div className="rounded-md border border-border bg-surface-muted/60 px-3 py-2.5">
              <p className="text-label font-medium text-text">
                Average rating · {published.length}{" "}
                {published.length === 1 ? "review" : "reviews"}
              </p>
              <div className="mt-1">
                <RatingStars rating={average} />
              </div>
            </div>
          ) : null}
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
                      <Badge tone="neutral">Awaiting review</Badge>
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
        {sentAsGuest ? (
          <p
            role="status"
            className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-body text-text"
          >
            Thank you! Your review was received and will appear once staff
            approve it.
          </p>
        ) : null}
        <form
          className="space-y-4 border border-border bg-surface px-4 py-4 sm:px-5"
          onSubmit={handleSubmit}
          noValidate
        >
          <Field label="Rating" htmlFor="pdp-review-rating">
            <InteractiveRatingPicker
              value={rating}
              onChange={(next) => {
                setRating(next);
                setSentAsGuest(false);
              }}
              error={errors.rating}
            />
          </Field>
          {session ? (
            <p className="text-caption text-text-muted">
              Signed in as{" "}
              <span className="font-medium text-text">{session.fullName}</span>
            </p>
          ) : (
            <Field label="Your name" htmlFor="pdp-review-name" error={errors.name}>
              <Input
                id="pdp-review-name"
                value={name}
                placeholder="Your name"
                maxLength={GUEST_NAME_MAX}
                autoComplete="name"
                onChange={(event) => {
                  setName(event.target.value);
                  setSentAsGuest(false);
                }}
              />
            </Field>
          )}
          <Field label="Review" htmlFor="pdp-review-body" error={errors.body}>
            <Textarea
              id="pdp-review-body"
              value={body}
              placeholder="Review"
              maxLength={REVIEW_BODY_MAX}
              onChange={(event) => {
                setBody(event.target.value);
                setSentAsGuest(false);
              }}
              rows={5}
            />
          </Field>
          {session ? null : (
            <HoneypotField value={website} onChange={setWebsite} />
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Submitting…" : "Submit review"}
          </Button>
        </form>
        {session ? null : (
          <p className="text-caption text-text-muted">
            Have an account?{" "}
            <Link
              href={`/account/login?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to keep track of your reviews.
          </p>
        )}
      </div>
    </div>
  );
}
