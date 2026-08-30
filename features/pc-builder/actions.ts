"use server";

import { productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";
import {
  BUILDER_SLOTS,
  isBuilderSlotId,
  selectedSlugs,
  type BuildSelection,
  type CompatibilityPart,
} from "@/lib/domain/pc-builder";

const MAX_BUILD_PRODUCTS = 24;

export async function loadSlotCandidates(
  slotId: string,
): Promise<ProductSummary[]> {
  if (!isBuilderSlotId(slotId)) {
    return [];
  }
  return productRepository.listByBuilderSlot(slotId);
}

export async function loadBuildProducts(
  selection: BuildSelection,
): Promise<ProductSummary[]> {
  const slugs = selectedSlugs(selection).slice(0, MAX_BUILD_PRODUCTS);
  return productRepository.listBySlugs(slugs);
}

/**
 * Loads builder attribute snapshots for selected slots only (not the full catalog).
 */
export async function loadCompatibilityParts(
  selection: BuildSelection,
): Promise<CompatibilityPart[]> {
  const parts: CompatibilityPart[] = [];

  for (const slot of BUILDER_SLOTS) {
    const slug = selection[slot.id];
    if (typeof slug !== "string" || !slug) {
      continue;
    }
    const product = await productRepository.getBySlug(slug);
    if (!product) {
      continue;
    }
    parts.push({
      slotId: slot.id,
      slug: product.slug,
      name: product.name,
      attrs: product.builderAttrs,
    });
    if (parts.length >= MAX_BUILD_PRODUCTS) {
      break;
    }
  }

  return parts;
}
