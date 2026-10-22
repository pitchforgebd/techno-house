"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/data";

/**
 * Click-to-open full image view (replaces the old hover-zoom lens/side
 * panel). Built on the native `<dialog>` element the same way
 * `DynamicPopup` is — `showModal()` gives the focus trap, Escape key and
 * top-layer stacking for free, so this only owns the entrance/exit
 * animation, the body scroll lock, and image navigation. Reuses the
 * sitewide `.th-popup`/`.th-popup-card` scrim+card animation so this
 * matches every other modal on the storefront.
 */
export function ProductImageLightbox({
  open,
  onClose,
  images,
  productName,
  index,
  onIndexChange,
}: {
  open: boolean;
  onClose: () => void;
  images: ProductImage[];
  productName: string;
  /** Controlled by the parent, so it's the same "current image" the
      thumbnail strip and main stage already track — no state to sync. */
  index: number;
  onIndexChange: (index: number) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [exiting, setExiting] = useState(false);
  const hasMultiple = images.length > 1;

  useEffect(() => {
    const node = dialogRef.current;
    if (!node || !open || node.open) {
      return;
    }
    node.showModal();
    cardRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const requestClose = useCallback(() => {
    setExiting(true);
  }, []);

  const finish = useCallback(() => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
    }
    setExiting(false);
    onClose();
  }, [onClose]);

  const go = useCallback(
    (delta: number) => {
      onIndexChange((index + delta + images.length) % images.length);
    },
    [index, images.length, onIndexChange],
  );

  if (!open) {
    return null;
  }

  const current = images[index] ?? images[0];
  if (!current) {
    return null;
  }

  return (
    <dialog
      ref={dialogRef}
      className="th-popup"
      data-exiting={exiting ? "true" : undefined}
      aria-label={`${productName} — image ${index + 1} of ${images.length}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          requestClose();
          return;
        }
        if (hasMultiple && event.key === "ArrowLeft") {
          go(-1);
        } else if (hasMultiple && event.key === "ArrowRight") {
          go(1);
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      onClose={finish}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          requestClose();
        }
      }}
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="th-popup-card relative flex max-h-[90vh] w-full max-w-3xl flex-col items-center outline-none"
        onAnimationEnd={(event) => {
          if (exiting && event.target === event.currentTarget) {
            finish();
          }
        }}
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close"
          className="absolute -top-2 right-0 z-10 flex size-10 items-center justify-center rounded-full bg-surface/90 text-text shadow-md backdrop-blur-sm transition hover:bg-surface hover:shadow-lg sm:top-0 sm:right-0"
        >
          <X className="size-5" aria-hidden />
        </button>

        <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          {/* Native img, not next/image: the lightbox is a one-off full-size
              view, not worth a second optimized variant of the same source. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.src}
            src={current.src}
            alt={current.alt}
            className="h-full w-full object-contain p-6"
            draggable={false}
          />

          {hasMultiple ? (
            <>
              <button
                type="button"
                className="absolute top-1/2 left-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text shadow-md backdrop-blur-sm transition hover:bg-surface hover:shadow-lg"
                aria-label="Previous image"
                onClick={() => go(-1)}
              >
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                className="absolute top-1/2 right-3 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text shadow-md backdrop-blur-sm transition hover:bg-surface hover:shadow-lg"
                aria-label="Next image"
                onClick={() => go(1)}
              >
                <ChevronRight className="size-5" aria-hidden />
              </button>
              <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-text/60 px-2.5 py-1 text-[0.7rem] font-medium text-white backdrop-blur-sm">
                {index + 1} / {images.length}
              </span>
            </>
          ) : null}
        </div>

        {hasMultiple ? (
          <ul
            className="mt-3 flex max-w-full gap-2 overflow-x-auto px-1 py-1"
            role="list"
            aria-label={`${productName} image thumbnails`}
          >
            {images.map((image, i) => (
              <li key={`${image.src}-${i}`} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => onIndexChange(i)}
                  className={`relative size-14 overflow-hidden rounded-md border bg-surface transition-colors ${
                    i === index
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.src}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </dialog>
  );
}
