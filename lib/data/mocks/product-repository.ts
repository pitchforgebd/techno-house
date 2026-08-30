import type { ProductRepository } from "@/lib/data/repositories/product-repository";
import {
  BRAND_FACET_KEY,
  CATALOG_ATTRIBUTE_KEYS,
} from "@/lib/catalog/listing-params";
import { mockCategories, mockProducts } from "@/lib/data/mocks/catalog";
import {
  buildBrandFacet,
  buildFacets,
  matchesQuery,
  normalizePage,
  paginate,
  sortProducts,
  toSummary,
} from "@/lib/data/mocks/query";
import type { BuilderSlot, ProductDetail } from "@/lib/data/types/catalog";

const MAX_SLOT_CANDIDATES = 48;

const CATALOG_KEY_SET = new Set<string>(CATALOG_ATTRIBUTE_KEYS);

function attributeKeysFromProducts(products: ProductDetail[]): string[] {
  const keys = new Set<string>();
  for (const product of products) {
    for (const key of Object.keys(product.attributes)) {
      if (CATALOG_KEY_SET.has(key)) {
        keys.add(key);
      }
    }
  }
  return [...keys].sort();
}

export const mockProductRepository: ProductRepository = {
  async getBySlug(slug) {
    return mockProducts.find((product) => product.slug === slug) ?? null;
  },

  async listBySlugs(slugs) {
    if (slugs.length === 0) {
      return [];
    }
    const order = new Map(slugs.map((slug, index) => [slug, index]));
    return mockProducts
      .filter((product) => order.has(product.slug))
      .sort(
        (left, right) =>
          (order.get(left.slug) ?? 0) - (order.get(right.slug) ?? 0),
      )
      .map(toSummary);
  },

  async listByBuilderSlot(slot: BuilderSlot) {
    return mockProducts
      .filter((product) => product.builderSlot === slot)
      .slice(0, MAX_SLOT_CANDIDATES)
      .map(toSummary);
  },

  async list(query) {
    const { page, pageSize } = normalizePage(query.page, query.pageSize);
    const matched = mockProducts.filter((product) =>
      matchesQuery(product, query, mockCategories),
    );
    const sorted = sortProducts(matched, query.sort);

    const category = query.categorySlug
      ? (mockCategories.find((item) => item.slug === query.categorySlug) ??
        null)
      : null;
    const filterKeys =
      category && category.filterKeys.length > 0
        ? category.filterKeys
        : attributeKeysFromProducts(sorted);

    const attributeFacets = buildFacets(sorted, filterKeys);
    const includeBrandFacet = !query.brandSlug;
    const brandFacet = includeBrandFacet ? buildBrandFacet(sorted) : null;
    const facets = brandFacet
      ? [
          brandFacet,
          ...attributeFacets.filter((f) => f.key !== BRAND_FACET_KEY),
        ]
      : attributeFacets.filter((f) => f.key !== BRAND_FACET_KEY);

    return {
      items: paginate(sorted, page, pageSize).map(toSummary),
      total: sorted.length,
      page,
      pageSize,
      facets,
    };
  },
};
