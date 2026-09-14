/**
 * Server-side PC Builder revalidation (P14-T06).
 *
 * Loads live candidates and enabled rules, then runs the pure snapshot.
 * The client may send slugs only — never prices or attributes.
 */
import { productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";
import {
  assembleValidatedBuild,
  buildCandidateSlugs,
  normalizeBuildSelection,
  type BuildSelection,
  type BuildValidationIssue,
  type BuildPowerSummary,
  type BuildPricingSummary,
  type BuildStockSummary,
  type CompatibilityResult,
  type ValidatedBuildSnapshot,
} from "@/lib/domain/pc-builder";
import { listEnabledRuleTypes } from "@/lib/pc-builder/rules";
import { getEffectiveBuilderSlots } from "@/lib/pc-builder/settings";

export type ValidatedBuild = {
  selection: BuildSelection;
  products: ProductSummary[];
  compatibility: CompatibilityResult | null;
  pricing: BuildPricingSummary;
  stock: BuildStockSummary;
  power: BuildPowerSummary;
  issues: BuildValidationIssue[];
  /** The admin-configured slot list this snapshot was built against. */
  slots: Awaited<ReturnType<typeof getEffectiveBuilderSlots>>;
};

function toValidatedBuild(
  snapshot: ValidatedBuildSnapshot,
  products: ProductSummary[],
  slots: Awaited<ReturnType<typeof getEffectiveBuilderSlots>>,
): ValidatedBuild {
  return {
    selection: snapshot.selection,
    products,
    compatibility: snapshot.compatibility,
    pricing: snapshot.pricing,
    stock: snapshot.stock,
    power: snapshot.power,
    issues: snapshot.issues,
    slots,
  };
}

export async function validateBuild(
  raw: BuildSelection,
): Promise<ValidatedBuild> {
  const selection = normalizeBuildSelection(raw);
  const slugs = buildCandidateSlugs(selection);
  const slots = await getEffectiveBuilderSlots();
  if (slugs.length === 0) {
    return toValidatedBuild(
      assembleValidatedBuild(selection, [], undefined, slots),
      [],
      slots,
    );
  }

  const [candidates, enabledTypes] = await Promise.all([
    productRepository.listBuilderCandidatesBySlugs(slugs),
    listEnabledRuleTypes(),
  ]);

  const snapshot = assembleValidatedBuild(
    selection,
    candidates.map((item) => ({
      slug: item.slug,
      name: item.name,
      priceAmount: item.price.amount,
      stockStatus: item.stockStatus,
      builderSlot: item.builderSlot,
      builderAttrs: item.builderAttrs,
    })),
    enabledTypes,
    slots,
  );

  const allowed = new Set(
    slugs.filter((slug) => candidates.some((item) => item.slug === slug)),
  );
  const products = candidates.filter((item) => allowed.has(item.slug));

  return toValidatedBuild(snapshot, products, slots);
}
