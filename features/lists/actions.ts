"use server";

import { categoryRepository, productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";

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

export type CompareCandidate = {
  slug: string;
  name: string;
  sku: string;
};

/**
 * "Type Product Name" options — one category at a time, because compare only
 * accepts products that share a category.
 */
export async function loadCompareCandidates(
  categorySlug: string,
): Promise<CompareCandidate[]> {
  const slug = categorySlug.trim();
  if (!slug) {
    return [];
  }
  const result = await productRepository.list({
    categorySlug: slug,
    page: 1,
    pageSize: 100,
    sort: "featured",
  });
  return result.items.map((product) => ({
    slug: product.slug,
    name: product.name,
    sku: product.sku,
  }));
}
