"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function unsplash(photoPath: string) {
  return `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=1400&h=900&q=80`;
}

const SLIDES = [
  {
    id: "catalog",
    href: "/shop",
    title: "Techno House",
    text: "Laptops, components, and PC builds specified before you buy.",
    cta: "Shop catalog",
    image: unsplash("photo-1496181133206-80ce9b88a853"),
    imageAlt: "Laptop on a desk — Techno House catalog",
  },
  {
    id: "builder",
    href: "/pc-builder",
    title: "Build a PC",
    text: "Pick parts slot by slot and check compatibility first.",
    cta: "Open PC Builder",
    image: unsplash("photo-1587202372775-e229f172b9d7"),
    imageAlt: "Open PC case with components — PC Builder",
  },
  {
    id: "offers",
    href: "/offers",
    title: "Current offers",
    text: "Sale prices in ৳ are display-only.",
    cta: "See offers",
    image: unsplash("photo-1526170375885-4d8ecf77b99f"),
    imageAlt: "Tech products on display — current offers",
  },
] as const;

export function HomeHeroSlider() {
  const [index, setIndex] = useState(0);
  const fallback = SLIDES[0];
  if (!fallback) {
    return null;
  }
  const slide = SLIDES[index] ?? fallback;

  function go(next: number) {
    setIndex((next + SLIDES.length) % SLIDES.length);
  }

  return (
    <div
      className="relative min-h-72 overflow-hidden bg-text md:min-h-[22rem]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Promotions"
    >
      <Image
        key={slide.id}
        src={slide.image}
        alt={slide.imageAlt}
        fill
        priority={index === 0}
        sizes="(min-width: 1024px) 70vw, 100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-text via-text/55 to-text/20"
      />
      <div className="relative flex min-h-72 flex-col justify-end p-6 md:min-h-[22rem] md:p-8">
        <p className="text-3xl font-bold tracking-tight text-primary-foreground md:text-display">
          {slide.title}
        </p>
        <p className="mt-2 max-w-md text-body text-primary-foreground/90">
          {slide.text}
        </p>
        <p className="mt-5">
          <Link
            href={slide.href}
            className={buttonClassName({
              variant: "ghost",
              className: "bg-surface text-text hover:bg-surface-muted",
            })}
          >
            {slide.cta}
          </Link>
        </p>
      </div>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center bg-surface/90 text-text"
          aria-label="Previous promotion"
          onClick={() => go(index - 1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center bg-surface/90 text-text"
          aria-label="Next promotion"
          onClick={() => go(index + 1)}
        >
          ›
        </button>
      </div>
      <div className="absolute bottom-4 left-6 z-10 flex gap-2" role="tablist">
        {SLIDES.map((item, slideIndex) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={slideIndex === index}
            aria-label={`Promotion ${slideIndex + 1}`}
            className={cn(
              "h-2 w-6",
              slideIndex === index ? "bg-surface" : "bg-surface/40",
            )}
            onClick={() => setIndex(slideIndex)}
          />
        ))}
      </div>
    </div>
  );
}
