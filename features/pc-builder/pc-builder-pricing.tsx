"use client";

import { PackageCheck, Zap } from "lucide-react";
import type {
  BuildPowerSummary,
  BuildPricingSummary,
  BuildStockSummary,
} from "@/lib/domain/pc-builder";
import { formatMoney } from "@/lib/format/currency";

function stockCopy(stock: BuildStockSummary, filledCount: number): string {
  if (filledCount === 0) {
    return "No parts selected yet.";
  }
  if (
    stock.unresolved > 0 &&
    stock.inStock + stock.lowStock + stock.outOfStock === 0
  ) {
    return "Resolving stock for selected parts…";
  }
  const bits: string[] = [];
  if (stock.inStock > 0) {
    bits.push(`${stock.inStock} in stock`);
  }
  if (stock.lowStock > 0) {
    bits.push(`${stock.lowStock} low stock`);
  }
  if (stock.outOfStock > 0) {
    bits.push(`${stock.outOfStock} out of stock`);
  }
  if (stock.unresolved > 0) {
    bits.push(`${stock.unresolved} unresolved`);
  }
  if (stock.allAvailable) {
    return `All selected parts available (${bits.join(" · ")}).`;
  }
  if (stock.anyOutOfStock) {
    return `Some parts are unavailable (${bits.join(" · ")}).`;
  }
  return bits.length > 0 ? bits.join(" · ") : "Stock status unknown.";
}

function powerCopy(power: BuildPowerSummary): string {
  if (power.estimatedDrawWatts !== null && power.psuWatts !== null) {
    return `Est. CPU + GPU draw ${power.estimatedDrawWatts}W · PSU ${power.psuWatts}W (display only).`;
  }
  if (power.estimatedDrawWatts !== null) {
    return `Est. CPU + GPU draw ${power.estimatedDrawWatts}W. Select a PSU to compare wattage.`;
  }
  if (power.psuWatts !== null) {
    return `PSU rated ${power.psuWatts}W. CPU/GPU TDP incomplete for a draw estimate.`;
  }
  return "Power estimate needs CPU/GPU TDP data on selected parts.";
}

export function PcBuilderPricing({
  filledCount,
  pricing,
  stock,
  power,
}: {
  filledCount: number;
  pricing: BuildPricingSummary;
  stock: BuildStockSummary;
  power: BuildPowerSummary;
}) {
  const totalLabel =
    pricing.missingPriceCount > 0 && pricing.pricedCount > 0
      ? "Partial total"
      : "Estimated total";

  return (
    <>
      <dl className="space-y-2 text-body">
        <div className="flex justify-between gap-3 border-t border-border pt-2">
          <dt className="font-semibold text-text">{totalLabel}</dt>
          <dd className="tabular-nums text-label font-semibold text-text">
            {formatMoney({ amount: pricing.subtotal })}
          </dd>
        </div>
        {pricing.missingPriceCount > 0 ? (
          <p className="text-caption text-text-muted">
            {pricing.missingPriceCount} selected part
            {pricing.missingPriceCount === 1 ? "" : "s"} missing a price.
          </p>
        ) : null}
      </dl>

      <div className="flex gap-2.5 rounded-md border border-border bg-surface-muted/60 px-3 py-2.5">
        <PackageCheck className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
        <div>
          <p className="text-caption font-medium text-text">Stock</p>
          <p className="mt-0.5 text-caption text-text-muted">
            {stockCopy(stock, filledCount)}
          </p>
        </div>
      </div>

      <div className="flex gap-2.5 rounded-md border border-border bg-surface-muted/60 px-3 py-2.5">
        <Zap className="mt-0.5 size-4 shrink-0 text-text-muted" aria-hidden />
        <div>
          <p className="text-caption font-medium text-text">Power estimate</p>
          <p className="mt-0.5 text-caption text-text-muted">
            {filledCount === 0
              ? "Select a CPU, GPU, and PSU to estimate draw."
              : powerCopy(power)}
          </p>
        </div>
      </div>
    </>
  );
}
