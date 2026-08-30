import type { ProductListQuery, ProductSort } from "@/lib/data/types/catalog";

/** Facet / query key reserved for brand multi-select. */
export const BRAND_FACET_KEY = "brand";

/** Default page size for catalog listings (pagination is URL-driven). */
export const LISTING_PAGE_SIZE = 8;

/** Known product attribute keys used as facets when not on a category page. */
export const CATALOG_ATTRIBUTE_KEYS = [
  "processor",
  "ram",
  "storage",
  "graphics",
  "socket",
  "cores",
  "coolerType",
  "formFactor",
  "ramType",
  "capacity",
  "memory",
  "wattage",
  "size",
  "panel",
] as const;

export const PRODUCT_SORTS = [
  "featured",
  "newest",
  "price_asc",
  "price_desc",
  "discount",
] as const satisfies readonly ProductSort[];

export const PRODUCT_SORT_LABELS: Record<ProductSort, string> = {
  featured: "Featured",
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  discount: "Discount",
};

const RESERVED = new Set([
  "q",
  "sort",
  "page",
  "pageSize",
  "stock",
  "minPrice",
  "maxPrice",
  BRAND_FACET_KEY,
]);

export type ListingSearchParams = Record<string, string | string[] | undefined>;

export type ParsedListingFilters = {
  inStockOnly: boolean;
  minPrice?: number;
  maxPrice?: number;
  brandSlugs: string[];
  filters: Record<string, string[]>;
};

export type ParsedListingQuery = ParsedListingFilters & {
  sort: ProductSort;
  page: number;
};

function asStringList(raw: string | string[] | undefined): string[] {
  if (raw == null) {
    return [];
  }
  const values = Array.isArray(raw) ? raw : [raw];
  return values.map((value) => value.trim()).filter(Boolean);
}

function parseOptionalInt(
  raw: string | string[] | undefined,
): number | undefined {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || value.trim() === "") {
    return undefined;
  }
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) {
    return undefined;
  }
  return n;
}

function parseSort(raw: string | string[] | undefined): ProductSort {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value && (PRODUCT_SORTS as readonly string[]).includes(value)) {
    return value as ProductSort;
  }
  return "featured";
}

function parsePage(raw: string | string[] | undefined): number {
  const n = parseOptionalInt(raw);
  return n && n >= 1 ? n : 1;
}

export function parseListingFilters(
  searchParams: ListingSearchParams,
  attributeKeys: string[],
): ParsedListingFilters {
  const allowed = new Set(attributeKeys);
  const stockRaw = Array.isArray(searchParams.stock)
    ? searchParams.stock[0]
    : searchParams.stock;
  const inStockOnly = stockRaw === "1" || stockRaw === "true";

  const filters: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(searchParams)) {
    if (RESERVED.has(key) || !allowed.has(key)) {
      continue;
    }
    const values = asStringList(raw);
    if (values.length > 0) {
      filters[key] = [...new Set(values)];
    }
  }

  return {
    inStockOnly,
    minPrice: parseOptionalInt(searchParams.minPrice),
    maxPrice: parseOptionalInt(searchParams.maxPrice),
    brandSlugs: [...new Set(asStringList(searchParams[BRAND_FACET_KEY]))],
    filters,
  };
}

export function parseListingQuery(
  searchParams: ListingSearchParams,
  attributeKeys: string[],
): ParsedListingQuery {
  return {
    ...parseListingFilters(searchParams, attributeKeys),
    sort: parseSort(searchParams.sort),
    page: parsePage(searchParams.page),
  };
}

export function toListQueryFilters(
  parsed: ParsedListingFilters,
  options: {
    showBrandFilter: boolean;
  },
): Pick<
  ProductListQuery,
  "inStockOnly" | "minPrice" | "maxPrice" | "brandSlugs" | "filters"
> {
  return {
    inStockOnly: parsed.inStockOnly || undefined,
    minPrice: parsed.minPrice,
    maxPrice: parsed.maxPrice,
    brandSlugs:
      options.showBrandFilter && parsed.brandSlugs.length > 0
        ? parsed.brandSlugs
        : undefined,
    filters:
      Object.keys(parsed.filters).length > 0 ? parsed.filters : undefined,
  };
}

export function listingHasActiveFilters(parsed: ParsedListingFilters): boolean {
  return (
    parsed.inStockOnly ||
    parsed.minPrice != null ||
    parsed.maxPrice != null ||
    parsed.brandSlugs.length > 0 ||
    Object.keys(parsed.filters).length > 0
  );
}

export function resetListingHref(
  pathname: string,
  preserved: { q?: string } = {},
): string {
  if (preserved.q) {
    return `${pathname}?q=${encodeURIComponent(preserved.q)}`;
  }
  return pathname;
}

/** Build query string preserving filters/sort (and optional page / q). */
export function buildListingSearchParams(
  parsed: ParsedListingQuery,
  options: {
    q?: string;
    includeBrand: boolean;
    page?: number;
    sort?: ProductSort;
    omitPage?: boolean;
  },
): URLSearchParams {
  const params = new URLSearchParams();
  if (options.q) {
    params.set("q", options.q);
  }

  const sort = options.sort ?? parsed.sort;
  if (sort !== "featured") {
    params.set("sort", sort);
  }

  if (!options.omitPage) {
    const page = options.page ?? parsed.page;
    if (page > 1) {
      params.set("page", String(page));
    }
  }

  if (parsed.inStockOnly) {
    params.set("stock", "1");
  }
  if (parsed.minPrice != null) {
    params.set("minPrice", String(parsed.minPrice));
  }
  if (parsed.maxPrice != null) {
    params.set("maxPrice", String(parsed.maxPrice));
  }
  if (options.includeBrand) {
    for (const slug of parsed.brandSlugs) {
      params.append(BRAND_FACET_KEY, slug);
    }
  }
  for (const [key, values] of Object.entries(parsed.filters)) {
    for (const value of values) {
      params.append(key, value);
    }
  }
  return params;
}

export function listingHref(
  pathname: string,
  parsed: ParsedListingQuery,
  options: {
    q?: string;
    includeBrand: boolean;
    page?: number;
    sort?: ProductSort;
    omitPage?: boolean;
  },
): string {
  const params = buildListingSearchParams(parsed, options);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
