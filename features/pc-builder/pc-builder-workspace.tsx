"use client";

import { useEffect, useState, useTransition } from "react";
import { validateBuildAction } from "@/features/pc-builder/actions";
import { PcBuilderSlotList } from "@/features/pc-builder/pc-builder-slot-list";
import { PcBuilderSummary } from "@/features/pc-builder/pc-builder-summary";
import { useBuilderStore } from "@/features/pc-builder/use-builder-store";
import { BUILDER_SLOTS, countFilledSlots } from "@/lib/domain/pc-builder";
import type { ValidatedBuild } from "@/lib/pc-builder/validate-build";

const EMPTY_BUILD: ValidatedBuild = {
  selection: {},
  products: [],
  slots: [...BUILDER_SLOTS],
  compatibility: null,
  pricing: { subtotal: 0, pricedCount: 0, missingPriceCount: 0 },
  stock: {
    inStock: 0,
    lowStock: 0,
    outOfStock: 0,
    unresolved: 0,
    anyOutOfStock: false,
    allAvailable: false,
  },
  power: {
    estimatedDrawWatts: null,
    psuWatts: null,
    drawKnown: false,
  },
  issues: [],
};

export function PcBuilderWorkspace() {
  const { selection, clearPart, clearBuild, loadSelection } = useBuilderStore();
  const [snapshot, setSnapshot] = useState<ValidatedBuild>(EMPTY_BUILD);
  const [pending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void validateBuildAction(selection)
        .then((next) => {
          if (!cancelled) {
            setSnapshot(next);
            setLoadError(null);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setLoadError(
              "Could not refresh build details. Your selections are still saved.",
            );
          }
        });
    });
    return () => {
      cancelled = true;
    };
  }, [selection]);

  const filled = countFilledSlots(selection, snapshot.slots).filled;
  const display = filled === 0 ? EMPTY_BUILD : snapshot;
  const productsBySlug = new Map(
    display.products.map((product) => [product.slug, product]),
  );
  const compatibility =
    filled === 0
      ? null
      : pending && snapshot.products.length === 0
        ? null
        : snapshot.compatibility;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <PcBuilderSlotList
        selection={selection}
        productsBySlug={productsBySlug}
        productsPending={pending}
        onClearPart={clearPart}
        slots={snapshot.slots}
      />
      <PcBuilderSummary
        selection={selection}
        products={display.products}
        productsPending={pending}
        compatibility={compatibility}
        pricing={display.pricing}
        stock={display.stock}
        power={display.power}
        issues={display.issues}
        loadError={loadError}
        onClearBuild={clearBuild}
        onLoadSelection={loadSelection}
        slots={snapshot.slots}
      />
    </div>
  );
}
