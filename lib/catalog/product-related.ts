/**
 * "Frequently bought together" / related products (Phase 4).
 *
 * `Product.relatedTo` / `relatedFrom` is a real self-relation that already
 * fed the storefront PDP (`app/(storefront)/product/[slug]/page.tsx` reads
 * `relatedSlugs`), but nothing ever wrote it — the admin "Add frequently
 * bought item" button was a fake toast with no backing mutation at all.
 */
import { getPrisma } from "@/lib/db/prisma";

export const PRODUCT_RELATED_MAX = 8;

export type RelatedProductOption = {
  id: string;
  slug: string;
  name: string;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

/** For the picker in the product form — excludes the product being edited. */
export async function searchRelatedProductCandidates(input: {
  query: string;
  excludeId?: string;
  take?: number;
}): Promise<RelatedProductOption[]> {
  if (!usesDatabase()) {
    return [];
  }
  const needle = input.query.trim();
  const rows = await getPrisma().product.findMany({
    where: {
      isActive: true,
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      ...(needle
        ? {
            OR: [
              { name: { contains: needle, mode: "insensitive" } },
              { sku: { contains: needle, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: input.take ?? 20,
    select: { id: true, slug: true, name: true },
  });
  return rows;
}

/**
 * Validates a set of related-product ids for one product: each must be a
 * real, currently-existing product, and a product cannot relate to itself.
 * `currentProductId` is `undefined` when creating (nothing to self-reference
 * yet).
 */
export async function parseRelatedProductIds(
  ids: string[] | undefined,
  currentProductId: string | undefined,
): Promise<{ ok: true; value: string[] } | { ok: false; formError: string }> {
  const raw = ids ?? [];
  if (raw.length > PRODUCT_RELATED_MAX) {
    return {
      ok: false,
      formError: `A product can have at most ${PRODUCT_RELATED_MAX} related products.`,
    };
  }
  if (raw.length === 0) {
    return { ok: true, value: [] };
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    if (currentProductId && trimmed === currentProductId) {
      return {
        ok: false,
        formError: "A product cannot be related to itself.",
      };
    }
    seen.add(trimmed);
    out.push(trimmed);
  }

  const found = await getPrisma().product.findMany({
    where: { id: { in: out } },
    select: { id: true },
  });
  if (found.length !== out.length) {
    return {
      ok: false,
      formError: "One of the selected related products no longer exists.",
    };
  }

  return { ok: true, value: out };
}
