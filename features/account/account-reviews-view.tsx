"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AccountShell } from "@/features/account/account-shell";
import {
  createCustomerReviewAction,
  deleteCustomerReviewAction,
} from "@/features/account/conversation-actions";
import { ProductPickerField } from "@/features/account/product-picker-field";
import { RatingStars } from "@/features/product/rating-stars";
import { validateMockReviewInput } from "@/lib/account/mock-conversations";
import type { CustomerReviewView } from "@/lib/catalog/review-input";
import { REVIEW_BODY_MAX, REVIEW_TITLE_MAX } from "@/lib/catalog/review-input";

function statusLabel(status: CustomerReviewView["status"]): string {
  if (status === "published") {
    return "Published";
  }
  if (status === "rejected") {
    return "Rejected";
  }
  return "Pending";
}

export function AccountReviewsView({
  reviews,
}: {
  reviews: CustomerReviewView[];
}) {
  const router = useRouter();
  const [productSlug, setProductSlug] = useState("");
  const [rating, setRating] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMockReviewInput({
      productSlug,
      rating,
      title,
      body,
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    startTransition(async () => {
      const result = await createCustomerReviewAction({
        productSlug,
        rating: Number(rating),
        title,
        body,
      });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not save the review.");
        return;
      }
      setRating("");
      setTitle("");
      setBody("");
      notifySuccess("Review submitted for moderation");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCustomerReviewAction(id);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not remove the review.");
        return;
      }
      notifySuccess("Review removed");
      router.refresh();
    });
  }

  return (
    <AccountShell title="Reviews">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          New reviews stay pending until staff publish them on the product page.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <ProductPickerField
            id="review-product"
            label="Product"
            value={productSlug}
            error={errors.productSlug}
            onChange={(slug) => {
              setProductSlug(slug);
            }}
          />
          <Field label="Rating" htmlFor="review-rating" error={errors.rating}>
            <Select
              id="review-rating"
              value={rating}
              onChange={(event) => setRating(event.target.value)}
            >
              <option value="">Select rating</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </Select>
          </Field>
          <Field label="Title" htmlFor="review-title" error={errors.title}>
            <Input
              id="review-title"
              value={title}
              maxLength={REVIEW_TITLE_MAX}
              onChange={(event) => setTitle(event.target.value)}
            />
          </Field>
          <Field
            label="Review"
            htmlFor="review-body"
            error={errors.body}
            hint="Verified purchase is not checked here."
          >
            <Textarea
              id="review-body"
              value={body}
              maxLength={REVIEW_BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Submit review"}
          </Button>
        </form>

        {reviews.length === 0 ? (
          <p className="text-body text-text-muted">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {reviews.map((review) => {
              const placedAt = new Date(review.createdAt).toLocaleString(
                "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <li
                  key={review.id}
                  className="rounded-md border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <RatingStars rating={review.rating} />
                    <Badge tone="neutral">{statusLabel(review.status)}</Badge>
                  </div>
                  <h2 className="mt-2 text-label font-semibold text-text">
                    {review.title}
                  </h2>
                  <p className="mt-1 text-body text-text-muted">
                    {review.body}
                  </p>
                  <p className="mt-2 text-caption text-text-muted">
                    <Link
                      href={`/product/${review.productSlug}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {review.productName}
                    </Link>
                    {" · "}
                    {placedAt}
                  </p>
                  {review.status === "pending" ? (
                    <button
                      type="button"
                      disabled={pending}
                      className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className: "mt-2 self-start px-0",
                      })}
                      onClick={() => handleDelete(review.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}
