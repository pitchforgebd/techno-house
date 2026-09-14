"use server";

import { getProductWeightsBySlug } from "@/lib/shipping/product-weights";

export async function loadCartWeights(
  slugs: string[],
): Promise<Record<string, number>> {
  return getProductWeightsBySlug(slugs);
}
