"use client";

import type { ReactNode } from "react";
import { useId, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/cn";

type ProductDetailTabsProps = {
  specifications: ReactNode;
  details: ReactNode;
  reviews: ReactNode;
  questions: ReactNode;
  /** Product Query Q&A feature flag — hides the tab entirely when off. */
  showQuestions?: boolean;
};

const ALL_TAB_ITEMS = [
  { id: "specifications", label: "Specifications" },
  { id: "details", label: "Details" },
  { id: "questions", label: "Q&A" },
  { id: "reviews", label: "Review" },
] as const;

type TabId = (typeof ALL_TAB_ITEMS)[number]["id"];

export function ProductDetailTabs({
  specifications,
  details,
  reviews,
  questions,
  showQuestions = true,
}: ProductDetailTabsProps) {
  const TAB_ITEMS = showQuestions
    ? ALL_TAB_ITEMS
    : ALL_TAB_ITEMS.filter((item) => item.id !== "questions");
  const [activeId, setActiveId] = useState<TabId>(TAB_ITEMS[0].id);
  const baseId = useId();

  const panels: Record<TabId, ReactNode> = {
    specifications,
    details,
    questions,
    reviews,
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = TAB_ITEMS.findIndex((item) => item.id === activeId);
    if (index < 0) {
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = TAB_ITEMS[(index + 1) % TAB_ITEMS.length];
      if (next) {
        setActiveId(next.id);
      }
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = TAB_ITEMS[(index - 1 + TAB_ITEMS.length) % TAB_ITEMS.length];
      if (prev) {
        setActiveId(prev.id);
      }
    }
  }

  return (
    <section aria-label="Product details">
      <div
        role="tablist"
        aria-label="Product information"
        className="flex flex-wrap"
        onKeyDown={onKeyDown}
      >
        {TAB_ITEMS.map((item, index) => {
          const selected = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-controls={`${baseId}-panel-${item.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              className={cn(
                "min-h-11 min-w-[7.5rem] border border-border px-4 text-label font-medium transition-colors sm:min-w-[8.5rem]",
                index > 0 && "-ml-px",
                selected
                  ? "relative z-[1] border-text bg-text text-primary-foreground"
                  : "bg-surface text-text hover:bg-surface-muted",
              )}
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${activeId}`}
        aria-labelledby={`${baseId}-tab-${activeId}`}
        className="mt-4 min-w-0"
      >
        {panels[activeId]}
      </div>
    </section>
  );
}
