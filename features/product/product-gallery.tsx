"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { ProductImageLightbox } from "@/features/product/product-image-lightbox";
import type { ProductImage } from "@/lib/data";
import { cn } from "@/lib/cn";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
  refundStickerSrc?: string | null;
};

export function ProductGallery({
  images,
  productName,
  refundStickerSrc,
}: ProductGalleryProps) {
  const galleryImages =
    images.length > 0
      ? images
      : [{ src: "/products/placeholder.svg", alt: productName }];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const safeIndex = Math.min(selectedIndex, galleryImages.length - 1);
  const current = galleryImages[safeIndex] ?? galleryImages[0];

  if (!current) {
    return null;
  }

  return (
    <figure className="w-full max-w-xl">
      <div className="relative flex items-start gap-3 sm:gap-4">
        <ul
          className="hidden h-[min(100vw,28rem)] max-h-[28rem] shrink-0 flex-col gap-2 overflow-y-auto sm:flex"
          role="list"
          aria-label={`${productName} image thumbnails`}
        >
          {galleryImages.map((image, index) => {
            const isSelected = index === safeIndex;
            return (
              <li key={`${image.src}-${index}`}>
                <button
                  type="button"
                  aria-label={`Show image ${index + 1}: ${image.alt}`}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => setSelectedIndex(index)}
                  className={cn(
                    "relative size-16 overflow-hidden rounded-md border bg-surface transition-colors lg:size-[4.25rem]",
                    isSelected
                      ? "border-primary ring-2 ring-primary/25"
                      : "border-border hover:border-primary/40",
                  )}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="72px"
                    className="object-contain p-1.5"
                  />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="relative min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`View full image ${safeIndex + 1} of ${galleryImages.length}`}
            className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-surface-muted/50 to-surface shadow-inner"
          >
            <span className="absolute left-3 top-3 z-10 inline-flex items-center rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[0.65rem] font-semibold text-text-muted shadow-sm backdrop-blur">
              Official Store
            </span>

            {/* Native img keeps the stage height fixed; next/image fill was
                expanding below the square frame on this layout. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 ease-out group-hover:scale-[1.03] sm:p-4"
              draggable={false}
              // This is the product page's LCP element. A native img gets no
              // automatic priority from next/image, so ask for it explicitly.
              fetchPriority="high"
              decoding="async"
            />

            {refundStickerSrc ? (
              <Image
                src={refundStickerSrc}
                alt="Refund available"
                width={72}
                height={72}
                className="pointer-events-none absolute right-2 top-2 z-10 size-14 object-contain sm:size-16"
                unoptimized
              />
            ) : null}

            <span className="pointer-events-none absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-2.5 py-1 text-[0.65rem] font-medium text-text-muted shadow-sm backdrop-blur">
              <Maximize2 aria-hidden className="size-3" strokeWidth={2} />
              Click to view
            </span>
          </button>
        </div>
      </div>

      <ul
        className="mt-3 flex gap-2 overflow-x-auto sm:hidden"
        role="list"
        aria-label={`${productName} image thumbnails`}
      >
        {galleryImages.map((image, index) => {
          const isSelected = index === safeIndex;
          return (
            <li key={`mobile-${image.src}-${index}`} className="shrink-0">
              <button
                type="button"
                aria-label={`Show image ${index + 1}`}
                aria-current={isSelected ? "true" : undefined}
                onClick={() => setSelectedIndex(index)}
                className={cn(
                  "relative size-14 overflow-hidden border bg-surface",
                  isSelected
                    ? "border-primary ring-2 ring-primary/25"
                    : "border-border",
                )}
              >
                <Image
                  src={image.src}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-contain p-1"
                />
              </button>
            </li>
          );
        })}
      </ul>

      {/* A bare "1 image" count reads like debug output on a product page —
          only say something when it's useful to the shopper. */}
      {galleryImages.length > 1 ? (
        <figcaption className="mt-2 text-caption text-text-muted">
          {galleryImages.length} images
        </figcaption>
      ) : null}

      <ProductImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={galleryImages}
        productName={productName}
        index={safeIndex}
        onIndexChange={setSelectedIndex}
      />
    </figure>
  );
}
