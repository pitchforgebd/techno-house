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
  estimateBuildPower,
  evaluateCompatibility,
  summarizeBuildPricing,
  summarizeBuildStock,
  type BuildPriceLine,
  type CompatibilityPart,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder";

export function PcBuilderWorkspace() {
  const { selection, selectPart, clearPart, clearBuild, loadSelection } =
    useBuilderStore();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [parts, setParts] = useState<CompatibilityPart[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      const [nextProducts, nextParts] = await Promise.all([
        loadBuildProducts(selection),
        loadCompatibilityParts(selection),
      ]);
      if (!cancelled) {
        setProducts(nextProducts);
        setParts(nextParts);
      }
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
    if (pending && parts.length === 0) {
      return null;
    }
    return evaluateCompatibility(parts);
  }, [parts, pending]);

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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
      <PcBuilderSlotList
        selection={selection}
        productsBySlug={productsBySlug}
        productsPending={pending}
        onSelectPart={selectPart}
        onClearPart={clearPart}
      />
      <PcBuilderSummary
        selection={selection}
        products={products}
        compatibility={compatibility}
        pricing={pricing}
        stock={stock}
        power={power}
        onClearBuild={clearBuild}
        onLoadSelection={loadSelection}
      />
    </div>
  );
}
