"use client";

import { PackageCheck, Zap } from "lucide-react";
import { PcBuilderStatusRow } from "@/features/pc-builder/pc-builder-status-row";
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
  stock,
  power,
}: {
  filledCount: number;
  stock: BuildStockSummary;
  power: BuildPowerSummary;
}) {
  return (
    <>
      <PcBuilderStatusRow
        icon={PackageCheck}
        label="Stock"
        tone={
          filledCount === 0
            ? "neutral"
            : stock.anyOutOfStock
              ? "danger"
              : stock.allAvailable
                ? "success"
                : "neutral"
        }
      >
        {stockCopy(stock, filledCount)}
      </PcBuilderStatusRow>

      <PcBuilderStatusRow icon={Zap} label="Power estimate">
        {filledCount === 0
          ? "Select a CPU, GPU, and PSU to estimate draw."
          : powerCopy(power)}
      </PcBuilderStatusRow>
    </>
  );
}

/** The headline figure at the top of the build summary. */
export function PcBuilderTotal({ pricing }: { pricing: BuildPricingSummary }) {
  const label =
    pricing.missingPriceCount > 0 && pricing.pricedCount > 0
      ? "Partial total"
      : "Estimated total";

  return (
    <div className="rounded-md bg-primary-soft/60 px-3 py-3 ring-1 ring-primary/10">
      <p className="text-caption font-medium text-text-muted">{label}</p>
      <p className="mt-0.5 tabular-nums text-2xl font-bold tracking-tight text-text">
        {formatMoney({ amount: pricing.subtotal })}
      </p>
      {pricing.missingPriceCount > 0 ? (
        <p className="mt-1 text-caption text-text-muted">
          {pricing.missingPriceCount} part
          {pricing.missingPriceCount === 1 ? "" : "s"} missing a price.
        </p>
      ) : null}
    </div>
  );
}
