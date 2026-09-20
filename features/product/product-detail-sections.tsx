"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ProductSectionHeading } from "@/features/product/product-section-heading";
import { cn } from "@/lib/cn";

type ProductDetailSectionsProps = {
  specifications: ReactNode;
  details: ReactNode;
  reviews: ReactNode;
  questions: ReactNode;
  /** Product Query Q&A feature flag — drops the section entirely when off. */
  showQuestions?: boolean;
};

/**
 * Specifications, Details, Q&A and Review all render stacked down the page
 * rather than one-at-a-time behind tabs: a shopper comparing parts reads
 * straight through, and search engines get the whole page's content instead
 * of only the first panel. The strip at the top stays as a jump list —
 * clicking scrolls to that section — and tracks whichever section is
 * currently on screen so it still says where you are.
 */
export function ProductDetailSections({
  specifications,
  details,
  reviews,
  questions,
  showQuestions = true,
}: ProductDetailSectionsProps) {
  const sections = useMemo(
    () =>
      [
        { id: "specifications", label: "Specifications", node: specifications },
        { id: "details", label: "Details", node: details },
        showQuestions
          ? { id: "questions", label: "Q&A", node: questions }
          : null,
        { id: "reviews", label: "Review", node: reviews },
      ].filter((item): item is { id: string; label: string; node: ReactNode } =>
        item !== null,
      ),
    [specifications, details, questions, reviews, showQuestions],
  );

  const [activeId, setActiveId] = useState(sections[0]?.id ?? "specifications");
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const targets = Array.from(
      container.querySelectorAll<HTMLElement>("[data-product-section]"),
    );
    if (targets.length === 0) {
      return;
    }
    // Top-biased band: a section counts as "current" once it reaches the
    // upper part of the viewport, which is what a reader perceives, rather
    // than when it happens to be centred.
    //
    // Intersection state is kept across callbacks, not read off the batch —
    // a callback only carries the entries that *changed*, so picking the
    // topmost from the batch alone leaves the strip stale whenever the only
    // change was a section leaving the band.
    const intersecting = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.getAttribute("data-product-section");
          if (!id) {
            continue;
          }
          if (entry.isIntersecting) {
            intersecting.add(id);
          } else {
            intersecting.delete(id);
          }
        }
        const topmost = targets
          .filter((target) => {
            const id = target.getAttribute("data-product-section");
            return id ? intersecting.has(id) : false;
          })
          .sort(
            (a, b) =>
              a.getBoundingClientRect().top - b.getBoundingClientRect().top,
          )[0];
        const next = topmost?.getAttribute("data-product-section");
        if (next) {
          setActiveId(next);
        }
      },
      { rootMargin: "-10% 0px -70% 0px", threshold: 0 },
    );
    for (const target of targets) {
      observer.observe(target);
    }
    return () => observer.disconnect();
  }, [sections]);

  function jumpTo(id: string) {
    const target = containerRef.current?.querySelector<HTMLElement>(
      `[data-product-section="${id}"]`,
    );
    if (!target) {
      return;
    }
    setActiveId(id);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section ref={containerRef} aria-label="Product details">
      <div className="flex flex-wrap" role="list">
        {sections.map((section, index) => {
          const active = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              aria-current={active ? "true" : undefined}
              className={cn(
                "min-h-11 min-w-[7.5rem] border border-border px-4 text-label font-medium transition-colors sm:min-w-[8.5rem]",
                index > 0 && "-ml-px",
                active
                  ? "relative z-[1] border-text bg-text text-primary-foreground"
                  : "bg-surface text-text hover:bg-surface-muted",
              )}
              onClick={() => jumpTo(section.id)}
            >
              {section.label}
            </button>
          );
        })}
      </div>

      {sections.map((section, index) => (
        <div
          key={section.id}
          data-product-section={section.id}
          // Room above each target so a jumped-to heading is not flush
          // against the top of the viewport.
          className={cn("min-w-0 scroll-mt-4", index === 0 ? "mt-4" : "mt-10")}
        >
          {/* The strip above already labels the first section; repeating it
              immediately underneath would read as a duplicate heading. */}
          {index > 0 ? <ProductSectionHeading>{section.label}</ProductSectionHeading> : null}
          <div className={index > 0 ? "mt-4" : undefined}>{section.node}</div>
        </div>
      ))}
    </section>
  );
}
