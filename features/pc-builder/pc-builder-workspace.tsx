"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  loadBuildProducts,
  loadCompatibilityParts,
} from "@/features/pc-builder/actions";
import { PcBuilderSlotList } from "@/features/pc-builder/pc-builder-slot-list";
import { PcBuilderSummary } from "@/features/pc-builder/pc-builder-summary";
import { useBuilderStore } from "@/features/pc-builder/use-builder-store";
import type { ProductSummary } from "@/lib/data";
import {
  BUILDER_SLOTS,
  countFilledSlots,
  estimateBuildPower,
  evaluateCompatibility,
  summarizeBuildPricing,
  summarizeBuildStock,
  type BuildPriceLine,
  type CompatibilityPart,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder";

export function PcBuilderWorkspace() {
  const { selection, clearPart, clearBuild, loadSelection } =
    useBuilderStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [parts, setParts] = useState<CompatibilityPart[]>([]);
  const [pending, startTransition] = useTransition();
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      void Promise.all([
        loadBuildProducts(selection),
        loadCompatibilityParts(selection),
      ])
        .then(([nextProducts, nextParts]) => {
          if (!cancelled) {
            setProducts(nextProducts);
            setParts(nextParts);
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

  const productsBySlug = useMemo(() => {
    const map = new Map<string, ProductSummary>();
    for (const product of products) {
      map.set(product.slug, product);
    }
    return map;
  }, [products]);

  const compatibility: CompatibilityResult | null = useMemo(() => {
    const filled = countFilledSlots(selection).filled;
    if (filled === 0) {
      return null;
    }
    if (pending && parts.length === 0) {
      return null;
    }
    return evaluateCompatibility(parts);
  }, [parts, pending, selection]);

  const priceLines: BuildPriceLine[] = useMemo(() => {
    const lines: BuildPriceLine[] = [];
    for (const slot of BUILDER_SLOTS) {
      const slug = selection[slot.id];
      if (typeof slug !== "string" || !slug) {
        continue;
      }
      const product = productsBySlug.get(slug);
      lines.push({
        priceAmount: product ? product.price.amount : null,
        stockStatus: product ? product.stockStatus : null,
      });
    }
    return lines;
  }, [selection, productsBySlug]);

  const pricing = useMemo(
    () => summarizeBuildPricing(priceLines),
    [priceLines],
  );
  const stock = useMemo(() => summarizeBuildStock(priceLines), [priceLines]);
  const power = useMemo(() => estimateBuildPower(parts), [parts]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <PcBuilderSlotList
        selection={selection}
        productsBySlug={productsBySlug}
        productsPending={pending}
        onClearPart={clearPart}
      />
      <PcBuilderSummary
        selection={selection}
        products={products}
        productsPending={pending}
        compatibility={compatibility}
        pricing={pricing}
        stock={stock}
        power={power}
        loadError={loadError}
        onClearBuild={clearBuild}
        onLoadSelection={loadSelection}
      />
    </div>
  );
}
