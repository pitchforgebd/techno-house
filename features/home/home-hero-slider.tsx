"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontHomeBanner } from "@/lib/design/home-banners";
import { cn } from "@/lib/cn";

const AUTOPLAY_MS = 6000;

/** Real, admin-managed (Design Studio → Banners & Sliders → Hero slider). */
export function HomeHeroSlider({
  banners,
}: {
  banners: StorefrontHomeBanner[];
}) {
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (count <= 1 || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (count === 0) {
    return null;
  }

  function go(next: number) {
    setIndex((next + count) % count);
  }

  return (
    <div
      className="relative min-h-[20rem] overflow-hidden rounded-sm bg-text sm:min-h-[24rem] md:min-h-[28rem] lg:min-h-[32rem]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((slide, slideIndex) => (
        <div
          key={slide.id}
          aria-hidden={slideIndex !== index}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-out",
            slideIndex === index
              ? "opacity-100"
              : "pointer-events-none opacity-0",
          )}
        >
          {/*
            No scrim and no overlaid copy: the banner artwork is the message,
            so anything painted on top only fights it. The whole slide is the
            link instead of a button inside it — `aria-label` carries the
            accessible name that the removed heading used to provide.
          */}
          {/* `prefetch={false}`: the link is operator-typed, and every slide's link is
              in the page at once; a mistyped one would otherwise log a 404 in every
              visitor's console, and hidden slides would be fetched for nothing. */}
          <Link
            href={slide.href}
            prefetch={false}
            aria-label={slide.title}
            tabIndex={slideIndex === index ? undefined : -1}
            className="block h-full w-full focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-bright"
          >
            <Image
              src={slide.image}
              alt={slide.imageAlt}
              fill
              priority={slideIndex === 0}
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover"
            />
          </Link>
        </div>
      ))}

      {count > 1 ? (
        <>
          <button
            type="button"
            className="absolute top-1/2 left-3 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text shadow-md backdrop-blur-sm transition hover:bg-surface hover:shadow-lg"
            aria-label="Previous promotion"
            onClick={() => go(index - 1)}
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <button
            type="button"
            className="absolute top-1/2 right-3 z-10 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 text-text shadow-md backdrop-blur-sm transition hover:bg-surface hover:shadow-lg"
            aria-label="Next promotion"
            onClick={() => go(index + 1)}
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
          <div
            className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2"
            role="tablist"
          >
            {banners.map((item, slideIndex) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={slideIndex === index}
                aria-label={`Promotion ${slideIndex + 1}`}
                className={cn(
                  "h-1.5 rounded-full shadow-sm transition-all",
                  slideIndex === index
                    ? "w-6 bg-surface"
                    : "w-2.5 bg-surface/50 hover:bg-surface/75",
                )}
                onClick={() => go(slideIndex)}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
