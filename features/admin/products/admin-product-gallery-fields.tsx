"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react";
import { notifyError } from "@/components/ui/feedback-provider";
import { AdminMediaPickerModal } from "@/features/admin/media/admin-media-picker";
import { PRODUCT_GALLERY_IMAGE_MAX } from "@/lib/catalog/gallery-input";
import { cn } from "@/lib/cn";

/**
 * The product gallery — every image after the thumbnail (AD-370).
 *
 * Before this, "Add gallery images" was a single upload box: one more image,
 * full stop. Any extra image a bulk import or a direct database edit had
 * added was invisible here and silently preserved only because the save path
 * never touched it. This replaces that one box with a real list: upload (or
 * pick from the library) several images in one go, reorder them, remove any
 * one, and the saved order is exactly the shown order.
 */
export function AdminProductGalleryFields({
  images,
  onChange,
  productName,
  disabled,
}: {
  images: string[];
  onChange: (next: string[]) => void;
  productName: string;
  disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  function addMany(paths: string[]) {
    const merged = [...images, ...paths];
    const overflow = merged.length - PRODUCT_GALLERY_IMAGE_MAX;
    const next = merged.slice(0, PRODUCT_GALLERY_IMAGE_MAX);
    onChange(next);
    if (overflow > 0) {
      notifyError({
        title: "Gallery is full",
        description: `A product can have at most ${PRODUCT_GALLERY_IMAGE_MAX} gallery images — ${overflow} of the new ones were not added.`,
      });
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= images.length) {
      return;
    }
    const next = [...images];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-neutral-500">
        Shown on the product page in this order — drag order aside, use the
        arrows. Upload several files at once, or add more than one from the
        library without closing it.
      </p>

      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((src, index) => (
            <li key={`${src}-${index}`} className="space-y-1">
              <div className="relative aspect-square overflow-hidden rounded-md border border-neutral-200 bg-neutral-50">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin preview of a media-library path */}
                <img
                  src={src}
                  alt={`${productName} — image ${index + 2}`}
                  className="absolute inset-0 size-full object-contain p-1.5"
                />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => removeAt(index)}
                  aria-label={`Remove gallery image ${index + 1}`}
                  className="absolute top-1 right-1 inline-flex size-6 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-sm hover:bg-white hover:text-red-600 disabled:opacity-60"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] text-neutral-400">
                  {index + 1} of {images.length}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={disabled || index === 0}
                    onClick={() => move(index, -1)}
                    aria-label={`Move gallery image ${index + 1} earlier`}
                    className="inline-flex size-6 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || index === images.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label={`Move gallery image ${index + 1} later`}
                    className="inline-flex size-6 items-center justify-center rounded-md border border-neutral-200 text-neutral-500 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-center text-sm text-neutral-500">
          No gallery images yet — just the thumbnail.
        </p>
      )}

      {images.length < PRODUCT_GALLERY_IMAGE_MAX ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 bg-white px-3 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:border-neutral-400 hover:bg-neutral-50",
            disabled && "cursor-not-allowed opacity-60",
          )}
        >
          <ImagePlus className="size-4" aria-hidden />
          Add gallery images ({images.length}/{PRODUCT_GALLERY_IMAGE_MAX})
        </button>
      ) : (
        <p className="text-xs text-neutral-500">
          Gallery is at the {PRODUCT_GALLERY_IMAGE_MAX}-image limit — remove
          one to add another.
        </p>
      )}

      {pickerOpen ? (
        <AdminMediaPickerModal
          open
          multiple
          onSelectMany={addMany}
          onClose={() => setPickerOpen(false)}
          title="Add gallery images"
          folder="products"
        />
      ) : null}
    </div>
  );
}
