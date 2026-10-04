"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductImage } from "@/lib/data";
import { cn } from "@/lib/cn";

type ProductGalleryProps = {
  images: ProductImage[];
  productName: string;
  refundStickerSrc?: string | null;
};

/** How much larger the side panel renders vs the hover lens. */
const ZOOM_FACTOR = 2.4;

type ZoomPoint = {
  lensLeft: number;
  lensTop: number;
  x: number;
  y: number;
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
  const [zoom, setZoom] = useState<ZoomPoint | null>(null);
  const [hoverZoomEnabled, setHoverZoomEnabled] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const sync = () => setHoverZoomEnabled(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const safeIndex = Math.min(selectedIndex, galleryImages.length - 1);
  const current = galleryImages[safeIndex] ?? galleryImages[0];

  if (!current) {
    return null;
  }

  function updateZoom(clientX: number, clientY: number) {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const lensW = rect.width / ZOOM_FACTOR;
    const lensH = rect.height / ZOOM_FACTOR;
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const lensLeftPx = Math.min(
      Math.max(localX - lensW / 2, 0),
      rect.width - lensW,
    );
    const lensTopPx = Math.min(
      Math.max(localY - lensH / 2, 0),
      rect.height - lensH,
    );

    setZoom({
      lensLeft: (lensLeftPx / rect.width) * 100,
      lensTop: (lensTopPx / rect.height) * 100,
      x: Math.min(Math.max(localX / rect.width, 0), 1),
      y: Math.min(Math.max(localY / rect.height, 0), 1),
    });
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
                  onClick={() => {
                    setSelectedIndex(index);
                    setZoom(null);
                  }}
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
          <div
            ref={stageRef}
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-surface",
              hoverZoomEnabled ? "lg:cursor-crosshair" : null,
            )}
            onMouseEnter={(event) => {
              if (hoverZoomEnabled) {
                updateZoom(event.clientX, event.clientY);
              }
            }}
            onMouseMove={(event) => {
              if (hoverZoomEnabled) {
                updateZoom(event.clientX, event.clientY);
              }
            }}
            onMouseLeave={() => setZoom(null)}
          >
            {/* Native img keeps the stage height fixed; next/image fill was
                expanding below the square frame on this layout. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={current.src}
              alt={current.alt}
              className="absolute inset-0 h-full w-full object-contain p-3 sm:p-4"
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

            {zoom && hoverZoomEnabled ? (
              <div
                aria-hidden
                className="pointer-events-none absolute hidden border border-white/80 bg-white/35 shadow-sm lg:block"
                style={{
                  width: `${100 / ZOOM_FACTOR}%`,
                  height: `${100 / ZOOM_FACTOR}%`,
                  left: `${zoom.lensLeft}%`,
                  top: `${zoom.lensTop}%`,
                }}
              />
            ) : null}
          </div>

          {zoom && hoverZoomEnabled ? (
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 z-30 hidden aspect-square w-full overflow-hidden border border-border bg-surface shadow-lg lg:block"
              style={{
                left: "calc(100% + 0.75rem)",
                backgroundImage: `url(${JSON.stringify(current.src)})`,
                backgroundRepeat: "no-repeat",
                backgroundSize: `${ZOOM_FACTOR * 100}%`,
                backgroundPosition: `${zoom.x * 100}% ${zoom.y * 100}%`,
              }}
            />
          ) : null}
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
      <figcaption className="mt-2 text-caption text-text-muted">
        {galleryImages.length > 1 ? `${galleryImages.length} images` : null}
        <span className="hidden lg:inline">
          {galleryImages.length > 1 ? " · " : null}
          Hover the image to zoom
        </span>
      </figcaption>
    </figure>
  );
}
