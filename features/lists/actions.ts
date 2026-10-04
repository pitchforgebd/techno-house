"use server";

import { categoryRepository, productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";
import {
  COMPARE_LIST_SIZE,
  COMPARE_SEARCH_MAX_RESULTS,
  isSearchableText,
  normalizeCompareCategory,
  normalizeCompareQuery,
  type CompareCandidate,
  type CompareCandidateList,
} from "@/lib/catalog/compare-search";

export type { CompareCandidate, CompareCandidateList };

export async function loadListProducts(
  slugs: string[],
): Promise<ProductSummary[]> {
  const unique = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  return productRepository.listBySlugs(unique.slice(0, 48));
}

export type CompareCategoryOption = { slug: string; name: string };

/** "Select Product Type" options on the compare page. */
export async function loadCompareCategories(): Promise<CompareCategoryOption[]> {
  const categories = await categoryRepository.list();
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
  }));
}

function toCandidate(product: ProductSummary): CompareCandidate {
  return { slug: product.slug, name: product.name, sku: product.sku };
}

/**
 * The picker's starter list — one category at a time, because compare only
 * accepts products that share a category. It is one page (at most 48), so
 * `total` lets the picker say how many more are only reachable by searching.
 */
export async function loadCompareCandidates(
  categorySlug: string,
): Promise<CompareCandidateList> {
  const slug = normalizeCompareCategory(categorySlug);
  if (!slug) {
    return { items: [], total: 0 };
  }
  const result = await productRepository.list({
    categorySlug: slug,
    page: 1,
    pageSize: COMPARE_LIST_SIZE,
    sort: "featured",
  });
  return { items: result.items.map(toCandidate), total: result.total };
}

/**
 * Searches the WHOLE category (not just the starter list): every typed word
 * must appear in the product's name, SKU, brand or category, in any order, so
 * "msi b650" finds "MSI MAG B650 Tomahawk". Needs three characters, returns at
 * most 20 published products.
 */
export async function searchCompareCandidates(
  categorySlug: string,
  query: string,
): Promise<CompareCandidate[]> {
  const slug = normalizeCompareCategory(categorySlug);
  const text = normalizeCompareQuery(query);
  if (!slug || !isSearchableText(text)) {
    return [];
  }
  const result = await productRepository.list({
    categorySlug: slug,
    q: text,
    qWords: true,
    page: 1,
    pageSize: COMPARE_SEARCH_MAX_RESULTS,
    sort: "featured",
  });
  return result.items.map(toCandidate);
}
