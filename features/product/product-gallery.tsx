"use client";

import Image from "next/image";
import { useState } from "react";
import type { ProductImage } from "@/lib/data";
import { cn } from "@/lib/cn";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const galleryImages =
    images.length > 0
      ? images
      : [{ src: "/products/placeholder.svg", alt: productName }];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeIndex = Math.min(selectedIndex, galleryImages.length - 1);
  const current = galleryImages[safeIndex] ?? galleryImages[0];

  if (!current) {
    return null;
  }

  return (
    <figure className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 gap-3 sm:gap-4">
        <ul
          className="hidden shrink-0 flex-col gap-2 sm:flex"
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
                    "relative size-16 overflow-hidden border bg-surface transition-colors lg:size-[4.25rem]",
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

        <div className="relative min-h-[16rem] flex-1 overflow-hidden border border-border bg-surface-muted sm:min-h-[22rem]">
          <Image
            src={current.src}
            alt={current.alt}
            fill
            priority={safeIndex === 0}
            sizes="(min-width: 1024px) 42vw, 100vw"
            className="object-contain p-4 sm:p-6"
          />
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

      <figcaption className="mt-2 text-caption text-text-muted">
        {galleryImages.length} images for display only. Stock photos are
        placeholders until final assets are available.
      </figcaption>
    </figure>
  );
}
