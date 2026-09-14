/**
 * Lightweight product-weight lookup for the checkout shipping preview
 * (AD-254). The authoritative calculation happens server-side in
 * create-order.ts — this is display-only, so it deliberately doesn't
 * extend the shared ProductSummary type used across the whole catalogue.
 */
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

export async function getProductWeightsBySlug(
  slugs: string[],
): Promise<Record<string, number>> {
  if (!usesDatabase() || slugs.length === 0) {
    return {};
  }
  const rows = await getPrisma().product.findMany({
    where: { slug: { in: slugs } },
    select: { slug: true, weightGrams: true },
  });
  return Object.fromEntries(rows.map((row) => [row.slug, row.weightGrams]));
}
