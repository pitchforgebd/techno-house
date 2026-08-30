"use client";

import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
  panel: ReactNode;
};

export function Tabs({ items }: { items: TabItem[] }) {
  const first = items[0];
  const [activeId, setActiveId] = useState(first?.id ?? "");
  const baseId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.findIndex((item) => item.id === activeId);
    if (index < 0) {
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const next = items[(index + 1) % items.length];
      if (next) {
        setActiveId(next.id);
      }
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const prev = items[(index - 1 + items.length) % items.length];
      if (prev) {
        setActiveId(prev.id);
      }
    }
  }

  return (
    <div>
      <div
        role="tablist"
        aria-label="Sections"
        className="flex gap-1 border-b border-border"
        onKeyDown={onKeyDown}
      >
        {items.map((item) => {
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
                "min-h-11 px-3 text-label font-medium",
                selected
                  ? "border-b-2 border-primary text-primary"
                  : "text-text-muted hover:text-text",
              )}
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item) =>
        item.id === activeId ? (
          <div
            key={item.id}
            role="tabpanel"
            id={`${baseId}-panel-${item.id}`}
            aria-labelledby={`${baseId}-tab-${item.id}`}
            className="pt-4"
          >
            {item.panel}
          </div>
        ) : null,
      )}
    </div>
  );
}
