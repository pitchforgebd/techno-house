"use client";

import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Sheet } from "@/components/ui/sheet";
import { loadSlotCandidates } from "@/features/pc-builder/actions";
import type { BuilderSlot, ProductSummary, StockStatus } from "@/lib/data";
import type { BuilderSlotMeta } from "@/lib/domain/pc-builder";
import { formatMoney } from "@/lib/format/currency";

function stockLabel(status: StockStatus): string {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "low_stock":
      return "Low stock";
    case "out_of_stock":
      return "Out of stock";
  }
}

export function PcBuilderSelector({
  slot,
  open,
  onClose,
  onSelect,
  selectedSlug,
}: {
  slot: BuilderSlotMeta | null;
  open: boolean;
  onClose: () => void;
  onSelect: (slotId: BuilderSlot, slug: string) => void;
  selectedSlug: string | null;
}) {
  const [candidates, setCandidates] = useState<ProductSummary[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open || !slot) {
      return;
    }
    let cancelled = false;
    startTransition(async () => {
      const items = await loadSlotCandidates(slot.id);
      if (!cancelled) {
        setCandidates(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, slot]);

  if (!slot) {
    return null;
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Select ${slot.label}`}>
      <p className="mb-4 text-caption text-text-muted">
        {slot.description}. Candidates load for this slot only — not the full
        catalog.
      </p>
      {pending && candidates.length === 0 ? (
        <p className="text-body text-text-muted">Loading parts…</p>
      ) : null}
      {!pending && candidates.length === 0 ? (
        <EmptyState
          title="No parts for this slot"
          description="Mock catalog has no products mapped to this builder slot yet."
        />
      ) : null}
      {candidates.length > 0 ? (
        <ul className="max-h-[min(70vh,32rem)] space-y-2 overflow-y-auto pr-1">
          {candidates.map((product) => {
            const isSelected = product.slug === selectedSlug;
            const disabled = product.stockStatus === "out_of_stock";
            return (
              <li key={product.slug}>
                <button
                  type="button"
                  disabled={disabled}
                  className={buttonClassName({
                    variant: "ghost",
                    className:
                      "h-auto w-full justify-start gap-3 rounded-md border border-border px-3 py-3 text-left disabled:opacity-50",
                  })}
                  onClick={() => {
                    onSelect(slot.id, product.slug);
                    onClose();
                  }}
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface-muted">
                    <Image
                      src={product.image.src}
                      alt=""
                      fill
                      className="object-contain p-1"
                      sizes="56px"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-label font-medium text-text">
                        {product.name}
                      </span>
                      {isSelected ? <Badge tone="new">Selected</Badge> : null}
                    </span>
                    <span className="mt-0.5 block text-caption text-text-muted">
                      {product.brandName} · {stockLabel(product.stockStatus)}
                    </span>
                    <span className="mt-1 block tabular-nums text-label font-semibold text-text">
                      {formatMoney(product.price)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Sheet>
  );
}
