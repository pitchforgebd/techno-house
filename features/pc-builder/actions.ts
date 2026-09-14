"use server";

import { productRepository } from "@/lib/data";
import type { BuilderCandidate, ProductSummary } from "@/lib/data";
import {
  buildCandidateSlugs,
  compatibilityPartsFromCandidates,
  isBuilderSlotId,
  type BuildSelection,
  type CompatibilityPart,
  type PcBuilderRuleType,
} from "@/lib/domain/pc-builder";
import { listEnabledRuleTypes } from "@/lib/pc-builder/rules";
import { validateBuild } from "@/lib/pc-builder/validate-build";

export async function loadSlotCandidates(
  slotId: string,
): Promise<BuilderCandidate[]> {
  if (!isBuilderSlotId(slotId)) {
    return [];
  }
  return productRepository.listByBuilderSlot(slotId);
}

export async function loadBuildProducts(
  selection: BuildSelection,
): Promise<ProductSummary[]> {
  return productRepository.listBySlugs(buildCandidateSlugs(selection));
}

/**
 * Loads builder attribute snapshots for selected slots only (not the full catalog).
 */
export async function loadCompatibilityParts(
  selection: BuildSelection,
): Promise<CompatibilityPart[]> {
  const slugs = buildCandidateSlugs(selection);
  const candidates =
    await productRepository.listBuilderCandidatesBySlugs(slugs);
  return compatibilityPartsFromCandidates(selection, candidates);
}

export async function loadEnabledRuleTypes(): Promise<PcBuilderRuleType[]> {
  return listEnabledRuleTypes();
}

export async function validateBuildAction(selection: BuildSelection) {
  return validateBuild(selection);
}
