"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function HomeProductRail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  function scrollByPage(direction: -1 | 1) {
    const node = scrollerRef.current;
    if (!node) {
      return;
    }
    node.scrollBy({
      left: direction * Math.max(node.clientWidth * 0.75, 280),
      behavior: "smooth",
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Previous ${label}`}
        className="absolute top-1/2 left-2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm hover:bg-surface-muted lg:inline-flex"
        onClick={() => scrollByPage(-1)}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label={`Next ${label}`}
        className="absolute top-1/2 right-2 z-10 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm hover:bg-surface-muted lg:inline-flex"
        onClick={() => scrollByPage(1)}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}
