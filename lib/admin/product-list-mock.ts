import type { Category, ProductSummary, StockStatus } from "@/lib/data";

export function isDraftProduct(product: {
  isActive?: boolean;
  stockStatus: StockStatus;
}): boolean {
  if (typeof product.isActive === "boolean") {
    return !product.isActive;
  }
  return product.stockStatus === "out_of_stock";
}

/**
 * Only used by `load-reviews.ts`'s `DATA_SOURCE=mock` fallback path (no
 * database at all) — the real, database-backed `/admin/products` list uses
 * real `ProductReview` aggregates instead (`lib/catalog/admin-products.ts`,
 * `loadListStats`).
 */
export function mockProductRating(productId: string): {
  score: number;
  reviews: number;
} {
  let hash = 0;
  for (const char of productId) {
    hash = (hash + char.charCodeAt(0)) % 997;
  }
  const score = 3 + (hash % 3);
  const reviews = 8 + (hash % 140);
  return { score, reviews };
}

export function discountPercent(product: ProductSummary): number | null {
  const compare = product.compareAtPrice;
  if (!compare || compare.amount <= product.price.amount) {
    return null;
  }
  return Math.round(
    ((compare.amount - product.price.amount) / compare.amount) * 100,
  );
}

export function categoryPathLabel(
  categorySlug: string,
  categories: Category[],
): { parent: string | null; name: string } {
  const category = categories.find((item) => item.slug === categorySlug);
  if (!category) {
    return { parent: null, name: categorySlug };
  }
  const parent = category.parentSlug
    ? (categories.find((item) => item.slug === category.parentSlug)?.name ??
      null)
    : null;
  return { parent, name: category.name };
}

export function initialPublished(product: {
  isActive?: boolean;
  stockStatus: StockStatus;
}): boolean {
  if (typeof product.isActive === "boolean") {
    return product.isActive;
  }
  return product.stockStatus !== "out_of_stock";
}

export function initialFeatured(product: ProductSummary): boolean {
  return product.isNew;
}

export function initialTodaysDeal(product: ProductSummary): boolean {
  return product.isSale;
}
