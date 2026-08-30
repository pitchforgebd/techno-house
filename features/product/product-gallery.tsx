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
    <figure>
      <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-surface-muted">
        <Image
          src={current.src}
          alt={current.alt}
          fill
          priority={safeIndex === 0}
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-contain p-4"
        />
      </div>
      {galleryImages.length > 1 ? (
        <ul
          className="mt-3 flex flex-wrap gap-2"
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
                    "relative h-16 w-16 overflow-hidden rounded-md border bg-surface-muted transition-colors",
                    isSelected
                      ? "border-brand ring-2 ring-brand/30"
                      : "border-border hover:border-brand/50",
                  )}
                >
                  <Image
                    src={image.src}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      <figcaption className="mt-2 text-caption text-text-muted">
        Images are for display only. Stock photos are placeholders until final
        assets are available.
      </figcaption>
    </figure>
  );
}
