"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  saveFlashSaleAction,
  uploadFlashSaleBannerAction,
} from "@/features/admin/flash-sales/flash-sale-actions";
import { AdminPromoProductPickerModal } from "@/features/admin/marketing/admin-promo-product-picker-modal";
import type {
  AdminFlashDeal,
  PromoCatalogProduct,
} from "@/lib/admin/promotions-offers-mock";
import {
  parseFlashDateTime,
  toFlashDateTimeLocal,
} from "@/lib/marketing/flash-sale-dates";
import { cn } from "@/lib/cn";

const controlClass =
  "h-10 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function initialDateTime(raw: string | undefined): string {
  if (!raw) {
    return "";
  }
  const parsed = parseFlashDateTime(raw);
  return parsed ? toFlashDateTimeLocal(parsed) : "";
}

export function AdminFlashSaleDetail({
  flashSale,
  isNew,
  catalog,
  categories,
}: {
  flashSale: AdminFlashDeal | null;
  isNew?: boolean;
  catalog: PromoCatalogProduct[];
  categories: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(flashSale?.title ?? "");
  const [startsAt, setStartsAt] = useState(
    initialDateTime(flashSale?.startsAt),
  );
  const [endsAt, setEndsAt] = useState(initialDateTime(flashSale?.endsAt));
  const [bannerSrc, setBannerSrc] = useState<string | null>(
    flashSale?.bannerSrc ?? null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedCount, setPickedCount] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploadPending, startUploadTransition] = useTransition();

  function handleBannerSelect(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    startUploadTransition(async () => {
      const result = await uploadFlashSaleBannerAction(formData);
      if (!result.ok) {
        notifyError(result.formError);
        return;
      }
      setBannerSrc(result.path);
      notifySuccess("Banner uploaded");
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    startTransition(async () => {
      const result = await saveFlashSaleAction({
        id: isNew ? undefined : flashSale?.id,
        title,
        startsAt,
        endsAt,
        bannerSrc,
      });
      if (!result.ok) {
        setFormError(result.formError);
        return;
      }
      notifySuccess(isNew ? "Flash deal created" : "Flash deal saved");
      router.refresh();
      if (isNew) {
        router.push(`/admin/flash-sales/${result.id}`);
      }
    });
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      <Link
        href="/admin/flash-sales"
        className="inline-flex text-sm font-medium text-[#3897f0] hover:underline"
      >
        ← Back to Flash Deals
      </Link>

      {formError ? (
        <Alert tone="danger" title="Could not save">
          <p className="text-caption">{formError}</p>
        </Alert>
      ) : null}

      <form
        className="rounded-lg border border-border bg-surface p-5 shadow-sm sm:p-6"
        onSubmit={handleSubmit}
      >
        <h1 className="text-lg font-semibold text-neutral-900">
          Flash Deal Information
        </h1>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-neutral-700">
                Title
              </span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Title"
                className={controlClass}
                required
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-neutral-700">
                  Starts
                </span>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(event) => setStartsAt(event.target.value)}
                  className={controlClass}
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-neutral-700">
                  Ends
                </span>
                <Input
                  type="datetime-local"
                  value={endsAt}
                  onChange={(event) => setEndsAt(event.target.value)}
                  className={controlClass}
                  required
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">Banner</span>
            <label
              className={cn(
                "relative flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 transition hover:border-[#3897f0] hover:bg-sky-50/40",
                uploadPending && "pointer-events-none opacity-60",
              )}
            >
              {bannerSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bannerSrc}
                  alt="Flash deal banner"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <Plus className="size-8" aria-hidden />
              )}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploadPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    handleBannerSelect(file);
                  }
                }}
              />
            </label>
            <p className="text-xs leading-relaxed text-neutral-500">
              {uploadPending
                ? "Uploading…"
                : "Minimum dimensions recommended: 436px width × 443px height."}
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-medium text-neutral-700">Products</h2>
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50/80 py-4 text-sm font-medium text-[#3897f0] hover:border-[#3897f0] hover:bg-sky-50/50"
          >
            <Plus className="size-4" aria-hidden />
            Add Product
            {pickedCount > 0 ? (
              <span className="text-neutral-500">({pickedCount})</span>
            ) : null}
          </button>
          <div className="rounded-md border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            Flash deal product assignment is not persisted yet. Checkout still
            uses catalogue prices.
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            disabled={pending}
            className="min-h-10 bg-[#3897f0] px-8 hover:bg-[#2f86d8]"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      <AdminPromoProductPickerModal
        open={pickerOpen}
        title="Add Product In Flash Deal"
        products={catalog}
        categories={categories}
        onClose={() => setPickerOpen(false)}
        onAdded={(ids) => setPickedCount((n) => n + ids.length)}
      />
    </div>
  );
}
