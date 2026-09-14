/**
 * Pure build snapshot (P14-T06).
 *
 * Turns a selection + already-loaded candidates into compatibility,
 * price, stock, and power. The server loads the candidates; the client
 * never supplies prices or attributes.
 */
import type { BuilderAttrs, BuilderSlot } from "@/lib/data/types/catalog";
import type { StockStatus } from "@/lib/data/types/common";
import {
  evaluateCompatibility,
  type CompatibilityPart,
  type CompatibilityResult,
} from "@/lib/domain/pc-builder/compatibility";
import type { PcBuilderRuleType } from "@/lib/domain/pc-builder/rules";
import {
  countFilledSlots,
  normalizeBuildSelection,
} from "@/lib/domain/pc-builder/selection";
import { BUILDER_SLOTS, type BuilderSlotMeta } from "@/lib/domain/pc-builder/slots";
import {
  estimateBuildPower,
  summarizeBuildPricing,
  summarizeBuildStock,
  type BuildPowerSummary,
  type BuildPriceLine,
  type BuildPricingSummary,
  type BuildStockSummary,
} from "@/lib/domain/pc-builder/totals";
import type { BuildSelection } from "@/lib/domain/pc-builder/types";

export type BuildValidateCandidate = {
  slug: string;
  name: string;
  priceAmount: number;
  stockStatus: StockStatus;
  builderSlot: BuilderSlot | null;
  builderAttrs: BuilderAttrs | null;
};

export type BuildValidationIssue = {
  code: "missing_part" | "slot_mismatch";
  slotId: BuilderSlot;
  message: string;
};

export type ValidatedBuildSnapshot = {
  selection: BuildSelection;
  parts: CompatibilityPart[];
  compatibility: CompatibilityResult | null;
  priceLines: BuildPriceLine[];
  pricing: BuildPricingSummary;
  stock: BuildStockSummary;
  power: BuildPowerSummary;
  issues: BuildValidationIssue[];
};

export function assembleValidatedBuild(
  raw: BuildSelection,
  candidates: BuildValidateCandidate[],
  enabledTypes?: Iterable<PcBuilderRuleType>,
  slots: readonly BuilderSlotMeta[] = BUILDER_SLOTS,
): ValidatedBuildSnapshot {
  const selection = normalizeBuildSelection(raw);
  const bySlug = new Map(candidates.map((item) => [item.slug, item]));
  const parts: CompatibilityPart[] = [];
  const priceLines: BuildPriceLine[] = [];
  const issues: BuildValidationIssue[] = [];

  for (const slot of slots) {
    const slug = selection[slot.id];
    if (typeof slug !== "string" || !slug) {
      continue;
    }
    const product = bySlug.get(slug);
    if (!product) {
      issues.push({
        code: "missing_part",
        slotId: slot.id,
        message: `${slot.label} is no longer available.`,
      });
      priceLines.push({ priceAmount: null, stockStatus: null });
      continue;
    }
    if (product.builderSlot && product.builderSlot !== slot.id) {
      issues.push({
        code: "slot_mismatch",
        slotId: slot.id,
        message: `${product.name} does not belong in the ${slot.label} slot.`,
      });
      priceLines.push({
        priceAmount: product.priceAmount,
        stockStatus: product.stockStatus,
      });
      continue;
    }
    parts.push({
      slotId: slot.id,
      slug: product.slug,
      name: product.name,
      attrs: product.builderAttrs,
    });
    priceLines.push({
      priceAmount: product.priceAmount,
      stockStatus: product.stockStatus,
    });
  }

  const filled = countFilledSlots(selection, slots).filled;
  return {
    selection,
    parts,
    compatibility:
      filled === 0 ? null : evaluateCompatibility(parts, enabledTypes),
    priceLines,
    pricing: summarizeBuildPricing(priceLines),
    stock: summarizeBuildStock(priceLines),
    power: estimateBuildPower(parts),
    issues,
  };
}
