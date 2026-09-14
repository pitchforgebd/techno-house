"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { createAdminCustomReviewAction } from "@/features/admin/reviews/review-actions";
import type { Category, ProductSummary } from "@/lib/data";
import { cn } from "@/lib/cn";

export function AdminCustomReviewForm({
  categories,
  products,
  initialProductSlug,
  canSave,
}: {
  categories: Category[];
  products: ProductSummary[];
  initialProductSlug?: string;
  canSave: boolean;
}) {
  const router = useRouter();
  const rootCategories = useMemo(
    () => categories.filter((item) => !item.parentSlug),
    [categories],
  );

  const initialProduct = initialProductSlug
    ? products.find((item) => item.slug === initialProductSlug)
    : null;

  const [reviewerName, setReviewerName] = useState("");
  const [categorySlug, setCategorySlug] = useState(
    initialProduct?.categorySlug
      ? (categories.find((item) => item.slug === initialProduct.categorySlug)
          ?.parentSlug ?? initialProduct.categorySlug)
      : "",
  );
  const [productId, setProductId] = useState(initialProduct?.id ?? "");
  const [rating, setRating] = useState(0);
  const [dateMode, setDateMode] = useState<"system" | "custom">("system");
  const [customDate, setCustomDate] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryProducts = products.filter((product) => {
    if (!categorySlug) {
      return false;
    }
    if (product.categorySlug === categorySlug) {
      return true;
    }
    const category = categories.find(
      (item) => item.slug === product.categorySlug,
    );
    return category?.parentSlug === categorySlug;
  });

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!canSave) {
      setError("You do not have permission to add reviews.");
      return;
    }

    startTransition(async () => {
      const result = await createAdminCustomReviewAction({
        productId,
        reviewerName,
        rating,
        comment,
        customDate: dateMode === "custom" ? customDate : null,
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the review.");
        return;
      }
      notifySuccess("Custom review published");
      router.push(`/admin/reviews/${result.productSlug}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <p className="text-caption font-medium text-primary">
          <Link href="/admin/reviews" className="hover:underline">
            Reviews
          </Link>
          <span className="text-text-muted"> / New</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-800">
          Add new custom review
        </h1>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Custom review">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="reviewer-name" required>
            Custom reviewer name
          </AdminFormLabel>
          <Input
            id="reviewer-name"
            value={reviewerName}
            onChange={(event) => setReviewerName(event.target.value)}
            className={adminFormControlClass}
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel>Custom reviewer image</AdminFormLabel>
          <div className="flex gap-0">
            <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
              Browse
            </span>
            <Input
              readOnly
              placeholder="Choose file"
              className={cn(adminFormControlClass, "rounded-l-none")}
            />
          </div>
          <p className="text-xs text-neutral-500">
            If you do not use a custom reviewer image, the default user image is
            shown.
          </p>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="review-category">Category</AdminFormLabel>
          <Select
            id="review-category"
            value={categorySlug}
            onChange={(event) => {
              setCategorySlug(event.target.value);
              setProductId("");
            }}
            className={adminFormControlClass}
          >
            <option value="">Select category</option>
            {rootCategories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="review-product" required>
            Product
          </AdminFormLabel>
          <Select
            id="review-product"
            value={productId}
            disabled={!categorySlug}
            onChange={(event) => setProductId(event.target.value)}
            className={cn(
              adminFormControlClass,
              !categorySlug && "bg-neutral-50 text-neutral-400",
            )}
          >
            <option value="">
              {categorySlug ? "Select product" : "Please select category first"}
            </option>
            {categoryProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-neutral-500">
            Select product for custom review.
          </p>
        </div>

        <div className="space-y-2">
          <AdminFormLabel required>Rating</AdminFormLabel>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }, (_, index) => {
              const value = index + 1;
              const active = value <= rating;
              return (
                <button
                  key={value}
                  type="button"
                  aria-label={`${value} star${value === 1 ? "" : "s"}`}
                  onClick={() => setRating(value)}
                  className="p-0.5"
                >
                  <Star
                    className={`size-7 ${
                      active
                        ? "fill-amber-400 text-amber-400"
                        : "fill-transparent text-neutral-300"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <fieldset className="space-y-2">
          <AdminFormLabel required>Date</AdminFormLabel>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="date-mode"
              checked={dateMode === "system"}
              onChange={() => setDateMode("system")}
              className="accent-[#3897f0]"
            />
            System date
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="radio"
              name="date-mode"
              checked={dateMode === "custom"}
              onChange={() => setDateMode("custom")}
              className="accent-[#3897f0]"
            />
            Select
          </label>
          {dateMode === "custom" ? (
            <Input
              type="date"
              value={customDate}
              onChange={(event) => setCustomDate(event.target.value)}
              className={cn(adminFormControlClass, "max-w-xs")}
            />
          ) : null}
        </fieldset>

        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="review-comment" required>
            Comment
          </AdminFormLabel>
          <Textarea
            id="review-comment"
            rows={5}
            placeholder="Your review"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15"
          />
        </div>

        <div className="space-y-1.5">
          <AdminFormLabel>Review images</AdminFormLabel>
          <div className="flex gap-0">
            <span className="inline-flex h-9 items-center rounded-l-md border border-r-0 border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-600">
              Browse
            </span>
            <Input
              readOnly
              placeholder="Choose file"
              className={cn(adminFormControlClass, "rounded-l-none")}
            />
          </div>
          <p className="text-xs text-neutral-500">
            These images are visible in the product review gallery. Upload
            square images.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/admin/reviews"
            className={buttonClassName({
              variant: "ghost",
              className: "border border-neutral-200",
            })}
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={pending}
            className="min-h-10 bg-[#3897f0] px-6 hover:bg-[#2f86d8]"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </AdminFormCard>
    </form>
  );
}
