/**
 * Storefront filter keys (P12-T07).
 *
 * Shop/search/brand listings accept URL params for filterable attributes.
 * Category pages still prefer the category's own `filterKeys`.
 */
import { CATALOG_ATTRIBUTE_KEYS } from "@/lib/catalog/listing-params";
import { getPrisma } from "@/lib/db/prisma";

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function listStorefrontFilterKeys(): Promise<string[]> {
  if (!usesCatalogDatabase()) {
    return [...CATALOG_ATTRIBUTE_KEYS];
  }

  const rows = await getPrisma().productAttribute.findMany({
    where: { isFilterable: true },
    orderBy: [{ position: "asc" }, { key: "asc" }],
    select: { key: true },
  });
  if (rows.length === 0) {
    return [...CATALOG_ATTRIBUTE_KEYS];
  }
  return rows.map((row) => row.key);
}
