"use client";

import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { BuilderSlotIcon } from "@/features/pc-builder/builder-slot-icons";
import {
  BUILDER_SLOTS,
  builderSelectPath,
  countFilledSlots,
  isSlotFilled,
  type BuildSelection,
  type BuilderSlotMeta,
} from "@/lib/domain/pc-builder";
import { cn } from "@/lib/cn";

export function PcBuilderSelectSidebar({
  selection,
  activeSlot,
}: {
  selection: BuildSelection;
  activeSlot: BuilderSlotMeta;
}) {
  const counts = countFilledSlots(selection);

  return (
    <aside
      className="h-fit space-y-4 rounded-md border border-border bg-surface p-4 lg:sticky lg:top-4"
      aria-labelledby="pc-builder-select-sidebar-heading"
    >
      <div>
        <h2
          id="pc-builder-select-sidebar-heading"
          className="text-label font-semibold text-text"
        >
          Selected components
        </h2>
        <p className="mt-1 text-caption text-text-muted">
          {counts.filled} of {counts.total} slots filled
        </p>
      </div>

      <ul className="max-h-72 space-y-1 overflow-y-auto">
        {BUILDER_SLOTS.map((slot) => {
          const filled = isSlotFilled(selection, slot.id);
          const isActive = slot.id === activeSlot.id;
          return (
            <li key={slot.id}>
              <Link
                href={builderSelectPath(slot.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-caption transition-colors",
                  isActive
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                )}
              >
                <BuilderSlotIcon slotId={slot.id} className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{slot.label}</span>
                {filled ? (
                  <CheckCircle2
                    className="size-4 shrink-0 text-success"
                    aria-label="Selected"
                  />
                ) : (
                  <Circle className="size-4 shrink-0 opacity-40" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <Link
        href="/pc-builder"
        className={buttonClassName({
          variant: "secondary",
          className: "w-full",
        })}
      >
        Back to PC Builder
      </Link>
    </aside>
  );
}
