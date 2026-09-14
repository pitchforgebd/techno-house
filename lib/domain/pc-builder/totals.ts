import type { StockStatus } from "@/lib/data/types/common";
import type { CompatibilityPart } from "@/lib/domain/pc-builder/compatibility";

export type BuildPriceLine = {
  priceAmount: number | null;
  stockStatus: StockStatus | null;
};

export type BuildPricingSummary = {
  subtotal: number;
  pricedCount: number;
  missingPriceCount: number;
};

export type BuildStockSummary = {
  inStock: number;
  lowStock: number;
  outOfStock: number;
  unresolved: number;
  anyOutOfStock: boolean;
  allAvailable: boolean;
};

export type BuildPowerSummary = {
  estimatedDrawWatts: number | null;
  psuWatts: number | null;
  drawKnown: boolean;
};

export function summarizeBuildPricing(
  lines: BuildPriceLine[],
): BuildPricingSummary {
  let subtotal = 0;
  let pricedCount = 0;
  let missingPriceCount = 0;
  for (const line of lines) {
    if (typeof line.priceAmount === "number" && line.priceAmount >= 0) {
      subtotal += line.priceAmount;
      pricedCount += 1;
    } else {
      missingPriceCount += 1;
    }
  }
  return { subtotal, pricedCount, missingPriceCount };
}

export function summarizeBuildStock(
  lines: BuildPriceLine[],
): BuildStockSummary {
  let inStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let unresolved = 0;
  for (const line of lines) {
    if (line.stockStatus === "in_stock") {
      inStock += 1;
    } else if (line.stockStatus === "low_stock") {
      lowStock += 1;
    } else if (line.stockStatus === "out_of_stock") {
      outOfStock += 1;
    } else {
      unresolved += 1;
    }
  }
  const resolved = inStock + lowStock + outOfStock;
  return {
    inStock,
    lowStock,
    outOfStock,
    unresolved,
    anyOutOfStock: outOfStock > 0,
    allAvailable:
      resolved > 0 &&
      outOfStock === 0 &&
      unresolved === 0 &&
      lines.length === resolved,
  };
}

/**
 * Display-only power estimate from CPU + GPU TDP when present.
 * Does not claim PSU adequacy (that is the compatibility engine).
 */
export function estimateBuildPower(
  parts: CompatibilityPart[],
): BuildPowerSummary {
  let estimatedDrawWatts = 0;
  let drawKnown = true;
  let hasDrawComponent = false;
  let psuWatts: number | null = null;

  for (const part of parts) {
    if (part.slotId === "psu") {
      const watts = part.attrs?.tdpWatts;
      psuWatts = typeof watts === "number" && watts > 0 ? watts : null;
      continue;
    }
    if (part.slotId !== "cpu" && part.slotId !== "gpu") {
      continue;
    }
    hasDrawComponent = true;
    const tdp = part.attrs?.tdpWatts;
    if (typeof tdp === "number" && tdp > 0) {
      estimatedDrawWatts += tdp;
    } else {
      drawKnown = false;
    }
  }

  return {
    estimatedDrawWatts:
      hasDrawComponent && drawKnown ? estimatedDrawWatts : null,
    psuWatts,
    drawKnown: hasDrawComponent ? drawKnown : false,
  };
}
