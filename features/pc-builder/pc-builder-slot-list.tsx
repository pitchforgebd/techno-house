"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { PcBuilderSelectedPart } from "@/features/pc-builder/pc-builder-selected-part";
import { PcBuilderSelector } from "@/features/pc-builder/pc-builder-selector";
import type { BuilderSlot, ProductSummary } from "@/lib/data";
import {
  BUILDER_SLOTS,
  isSlotFilled,
  type BuildSelection,
  type BuilderSlotMeta,
} from "@/lib/domain/pc-builder";

export function PcBuilderSlotList({
  selection,
  productsBySlug,
  productsPending,
  onSelectPart,
  onClearPart,
}: {
  selection: BuildSelection;
  productsBySlug: Map<string, ProductSummary>;
  productsPending: boolean;
  onSelectPart: (slotId: BuilderSlot, slug: string) => void;
  onClearPart: (slotId: BuilderSlot) => void;
}) {
  const [activeSlot, setActiveSlot] = useState<BuilderSlotMeta | null>(null);

  return (
    <>
      <section
        className="rounded-md border border-border bg-surface"
        aria-labelledby="pc-builder-slots-heading"
      >
        <div className="border-b border-border px-4 py-3">
          <h2
            id="pc-builder-slots-heading"
            className="text-label font-semibold text-text"
          >
            Components
          </h2>
          <p className="mt-1 text-caption text-text-muted">
            Selected parts show image, stock, and price. Replace or remove
            anytime.
          </p>
        </div>
        <ul className="divide-y divide-border">
          {BUILDER_SLOTS.map((slot, index) => {
            const filled = isSlotFilled(selection, slot.id);
            const slug = selection[slot.id] ?? null;
            const product =
              typeof slug === "string" ? productsBySlug.get(slug) : undefined;

            if (filled) {
              return (
                <PcBuilderSelectedPart
                  key={slot.id}
                  slot={slot}
                  index={index}
                  product={product}
                  missingSlug={
                    !product && typeof slug === "string" ? slug : null
                  }
                  isResolving={!product && productsPending}
                  onChange={() => setActiveSlot(slot)}
                  onRemove={() => onClearPart(slot.id)}
                />
              );
            }

            return (
              <li
                key={slot.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-muted text-caption font-semibold tabular-nums text-text-muted"
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-label font-medium text-text">
                      {slot.label}
                    </p>
                    {slot.required ? (
                      <Badge tone="neutral">Required</Badge>
                    ) : (
                      <Badge tone="neutral">Optional</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-caption text-text-muted">
                    {slot.description} · Not selected
                  </p>
                </div>
                <button
                  type="button"
                  className={buttonClassName({
                    size: "sm",
                    variant: "primary",
                    className: "shrink-0",
                  })}
                  onClick={() => setActiveSlot(slot)}
                >
                  Select
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <PcBuilderSelector
        slot={activeSlot}
        open={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        onSelect={onSelectPart}
        selectedSlug={
          activeSlot
            ? ((selection[activeSlot.id] as string | null | undefined) ?? null)
            : null
        }
      />
    </>
  );
}
