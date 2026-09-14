import type {
  BuilderCandidate,
  Category,
  Facet,
  ProductDetail,
  ProductListQuery,
  ProductSummary,
} from "@/lib/data/types/catalog";
import type { StockStatus } from "@/lib/data/types/common";
import { BRAND_FACET_KEY } from "@/lib/catalog/listing-params";
import { normalizeSearchNeedle } from "@/lib/search/query";

const IN_STOCK: StockStatus[] = ["in_stock", "low_stock"];

export function toSummary(product: ProductDetail): ProductSummary {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandSlug: product.brandSlug,
    brandName: product.brandName,
    categorySlug: product.categorySlug,
    sku: product.sku,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    stockStatus: product.stockStatus,
    warrantyLabel: product.warrantyLabel,
    warrantyBadge: product.warrantyBadge,
    image: product.image,
    specs: product.specs,
    isNew: product.isNew,
    isNewArrival: product.isNewArrival,
    isSale: product.isSale,
    discountStartsAt: product.discountStartsAt,
    discountEndsAt: product.discountEndsAt,
    labels: product.labels,
  };
}

export function toCandidate(product: ProductDetail): BuilderCandidate {
  return {
    ...toSummary(product),
    builderSlot: product.builderSlot,
    builderAttrs: product.builderAttrs,
  };
}

export function categoryTreeSlugs(
  slug: string,
  categories: Category[],
): Set<string> {
  const slugs = new Set<string>([slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (
        category.parentSlug &&
        slugs.has(category.parentSlug) &&
        !slugs.has(category.slug)
      ) {
        slugs.add(category.slug);
        grew = true;
      }
    }
  }
  return slugs;
}

export function matchesQuery(
  product: ProductDetail,
  query: ProductListQuery,
  categories: Category[],
): boolean {
  if (query.categorySlug) {
    const allowed = categoryTreeSlugs(query.categorySlug, categories);
    if (!allowed.has(product.categorySlug)) {
      return false;
    }
  }

  if (query.brandSlug && product.brandSlug !== query.brandSlug) {
    return false;
  }

  if (query.brandSlugs && query.brandSlugs.length > 0) {
    if (!query.brandSlugs.includes(product.brandSlug)) {
      return false;
    }
  }

  if (query.inStockOnly && !IN_STOCK.includes(product.stockStatus)) {
    return false;
  }

  if (query.onSaleOnly && !product.isSale) {
    return false;
  }

  if (query.minPrice != null && product.price.amount < query.minPrice) {
    return false;
  }

  if (query.maxPrice != null && product.price.amount > query.maxPrice) {
    return false;
  }

  const needle = normalizeSearchNeedle(query.q).toLowerCase();
  if (needle) {
    const category = categories.find(
      (item) => item.slug === product.categorySlug,
    );
    const haystack = [
      product.name,
      product.sku,
      product.brandName,
      product.brandSlug,
      product.categorySlug,
      category?.name ?? "",
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) {
      return false;
    }
  }

  if (query.filters) {
    for (const [key, values] of Object.entries(query.filters)) {
      if (values.length === 0) {
        continue;
      }
      const actual = product.attributes[key];
      if (!actual || !values.includes(actual)) {
        return false;
      }
    }
  }

  return true;
}

export function sortProducts(
  products: ProductDetail[],
  sort: ProductListQuery["sort"],
): ProductDetail[] {
  const copy = [...products];
  switch (sort) {
    case "newest":
      return copy.reverse();
    case "price_asc":
      return copy.sort((a, b) => a.price.amount - b.price.amount);
    case "price_desc":
      return copy.sort((a, b) => b.price.amount - a.price.amount);
    case "discount":
      return copy.sort((a, b) => discount(b) - discount(a));
    default:
      return copy;
  }
}

function discount(product: ProductDetail): number {
  if (!product.compareAtPrice) {
    return 0;
  }
  return product.compareAtPrice.amount - product.price.amount;
}

export function buildFacets(
  products: ProductDetail[],
  filterKeys: string[],
): Facet[] {
  return filterKeys
    .map((key) => {
      const counts = new Map<string, number>();
      for (const product of products) {
        const value = product.attributes[key];
        if (!value) {
          continue;
        }
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      return {
        key,
        values: [...counts.entries()]
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => a.value.localeCompare(b.value)),
      };
    })
    .filter((facet) => facet.values.length > 0);
}

export function buildBrandFacet(products: ProductDetail[]): Facet | null {
  const counts = new Map<string, number>();
  for (const product of products) {
    counts.set(product.brandSlug, (counts.get(product.brandSlug) ?? 0) + 1);
  }
  if (counts.size === 0) {
    return null;
  }
  return {
    key: BRAND_FACET_KEY,
    values: [...counts.entries()]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => a.value.localeCompare(b.value)),
  };
}

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const safeSize = Math.min(48, Math.max(1, pageSize));
  const start = (safePage - 1) * safeSize;
  return items.slice(start, start + safeSize);
}

export function normalizePage(page: number, pageSize: number) {
  return {
    page: Math.max(1, page),
    pageSize: Math.min(48, Math.max(1, pageSize)),
  };
}
