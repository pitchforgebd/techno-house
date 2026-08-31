"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CheckCircle2, Circle, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { BuilderSlotIcon } from "@/features/pc-builder/builder-slot-icons";
import { PcBuilderSelectedPart } from "@/features/pc-builder/pc-builder-selected-part";
import type { BuilderSlot, ProductSummary } from "@/lib/data";
import {
  BUILDER_SLOTS,
  builderSelectPath,
  countFilledSlots,
  isSlotFilled,
  type BuildSelection,
} from "@/lib/domain/pc-builder";
import { cn } from "@/lib/cn";

export function PcBuilderSlotList({
  selection,
  productsBySlug,
  productsPending,
  onClearPart,
}: {
  selection: BuildSelection;
  productsBySlug: Map<string, ProductSummary>;
  productsPending: boolean;
  onClearPart: (slotId: BuilderSlot) => void;
}) {
  const counts = useMemo(() => countFilledSlots(selection), [selection]);
  const progress =
    counts.total > 0 ? Math.round((counts.filled / counts.total) * 100) : 0;

  return (
    <section
      className="overflow-hidden rounded-md border border-border bg-surface"
      aria-labelledby="pc-builder-slots-heading"
    >
      <div className="border-b border-border bg-surface-muted/40 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="pc-builder-slots-heading"
              className="text-lg font-semibold tracking-tight text-text"
            >
              Choose your components
            </h2>
            <p className="mt-1 max-w-prose text-caption text-text-muted">
              Pick one part per slot. Each slot opens a dedicated selection
              page. Compatibility checks run as you build.
            </p>
          </div>
          <div className="text-right">
            <p className="text-caption font-medium text-text-muted">Progress</p>
            <p className="tabular-nums text-label font-semibold text-text">
              {counts.filled} / {counts.total} slots
            </p>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Build progress"
          />
        </div>
      </div>

      <ul className="divide-y divide-border">
        {BUILDER_SLOTS.map((slot) => {
          const filled = isSlotFilled(selection, slot.id);
          const slug = selection[slot.id] ?? null;
          const product =
            typeof slug === "string" ? productsBySlug.get(slug) : undefined;

          if (filled) {
            return (
              <PcBuilderSelectedPart
                key={slot.id}
                slot={slot}
                product={product}
                missingSlug={
                  !product && typeof slug === "string" ? slug : null
                }
                isResolving={!product && productsPending}
                onRemove={() => onClearPart(slot.id)}
              />
            );
          }

          return (
            <li key={slot.id}>
              <Link
                href={builderSelectPath(slot.id)}
                className="flex w-full flex-wrap items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-muted/50 sm:flex-nowrap sm:px-5"
              >
                <span
                  className={cn(
                    "inline-flex size-10 shrink-0 items-center justify-center rounded-md border",
                    slot.required
                      ? "border-primary/20 bg-primary/10 text-primary"
                      : "border-border bg-surface-muted text-text-muted",
                  )}
                >
                  <BuilderSlotIcon slotId={slot.id} className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-label font-semibold text-text">
                      {slot.label}
                    </p>
                    {slot.required ? (
                      <Badge tone="neutral">Required</Badge>
                    ) : (
                      <Badge tone="neutral">Optional</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-muted">
                    <Circle className="size-3.5 shrink-0" aria-hidden />
                    {slot.description}
                  </p>
                </div>
                <span
                  className={buttonClassName({
                    size: "sm",
                    variant: "primary",
                    className: "inline-flex shrink-0 gap-1.5",
                  })}
                >
                  <Plus className="size-4" aria-hidden />
                  Select
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {counts.filled === counts.total ? (
        <div className="flex items-center gap-2 border-t border-border bg-success/5 px-4 py-3 text-caption text-success sm:px-5">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          All slots filled. Review compatibility and add the build to cart.
        </div>
      ) : null}
    </section>
  );
}
