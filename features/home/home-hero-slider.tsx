"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { StorefrontHomeBanner } from "@/lib/design/home-banners";
import { cn } from "@/lib/cn";

const AUTOPLAY_MS = 6000;
/** When to start loading the next slide after one is shown. */
const PRELOAD_NEXT_MS = 2500;

/** Real, admin-managed (Design Studio → Banners & Sliders → Hero slider). */
export function HomeHeroSlider({
  banners,
}: {
  banners: StorefrontHomeBanner[];
}) {
  const count = banners.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Which slides have their <Image> in the page (SEO phase 4). All slides are
  // stacked in the same visible box, so `loading="lazy"` never held the
  // hidden ones back — every banner (450–720 KB each on the live site) was
  // downloaded at load. Now only the first is in the server HTML (and
  // preloaded as the LCP image); the next one is added once the page has
  // settled, and each later one just before it is shown.
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([0]));

  const mount = useCallback((slide: number) => {
    setMounted((current) =>
      current.has(slide) ? current : new Set([...current, slide]),
    );
  }, []);

  // Preload the slide that comes next, a little after the current one is
  // shown — well inside the autoplay interval, so it is ready in time.
  useEffect(() => {
    if (count <= 1) {
      return;
    }
    const timer = window.setTimeout(
      () => mount((index + 1) % count),
      PRELOAD_NEXT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [index, count, mount]);

  useEffect(() => {
    if (count <= 1 || paused) {
      return;
    }
    const timer = window.setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % count;
        mount(next);
        return next;
      });
    }, AUTOPLAY_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, mount]);

  if (count === 0) {
    return null;
  }

  function go(next: number) {
    const target = (next + count) % count;
    mount(target);
    setIndex(target);
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
            {mounted.has(slideIndex) ? (
              <Image
                src={slide.image}
                alt={slide.imageAlt}
                fill
                // First slide = LCP: preloaded, fetchpriority high, eager.
                priority={slideIndex === 0}
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="object-cover"
              />
            ) : null}
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
