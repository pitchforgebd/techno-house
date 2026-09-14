import type { ProductSort, StockStatus } from "@/lib/data";

export const ADMIN_PRODUCT_PAGE_SIZE = 10;

export type AdminStockFilter = "all" | StockStatus;

export type AdminProductTab = "all" | "inhouse" | "drafts";

export type AdminProductListParams = {
  q: string;
  categorySlug: string | null;
  stock: AdminStockFilter;
  sort: ProductSort;
  tab: AdminProductTab;
  page: number;
};

export type AdminProductSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(n, 500);
}

function isStockFilter(value: string): value is AdminStockFilter {
  return (
    value === "all" ||
    value === "in_stock" ||
    value === "low_stock" ||
    value === "out_of_stock"
  );
}

function isProductSort(value: string): value is ProductSort {
  return (
    value === "featured" ||
    value === "newest" ||
    value === "price_asc" ||
    value === "price_desc" ||
    value === "discount"
  );
}

function isProductTab(value: string): value is AdminProductTab {
  return value === "all" || value === "inhouse" || value === "drafts";
}

function normalizeProductTab(value: string): AdminProductTab {
  if (isProductTab(value)) {
    return value;
  }
  // Legacy tab values from earlier UI pass.
  if (value === "physical" || value === "digital") {
    return "all";
  }
  return "all";
}

export function parseAdminProductListParams(
  searchParams: AdminProductSearchParams,
): AdminProductListParams {
  const stockRaw = first(searchParams.stock).trim() || "all";
  const sortRaw = first(searchParams.sort).trim() || "newest";
  const category = first(searchParams.category).trim();
  const tabRaw = first(searchParams.tab).trim() || "all";

  return {
    q: first(searchParams.q).trim().slice(0, 120),
    categorySlug: category || null,
    stock: isStockFilter(stockRaw) ? stockRaw : "all",
    sort: isProductSort(sortRaw) ? sortRaw : "newest",
    tab: normalizeProductTab(tabRaw),
    page: parsePage(first(searchParams.page)),
  };
}

export function adminProductsHref(
  params: Partial<AdminProductListParams> & {
    base?: AdminProductListParams;
  },
): string {
  const base: AdminProductListParams = params.base ?? {
    q: "",
    categorySlug: null,
    stock: "all",
    sort: "newest",
    tab: "all",
    page: 1,
  };
  const next: AdminProductListParams = {
    q: params.q ?? base.q,
    categorySlug:
      params.categorySlug === undefined
        ? base.categorySlug
        : params.categorySlug,
    stock: params.stock ?? base.stock,
    sort: params.sort ?? base.sort,
    tab: params.tab ?? base.tab,
    page: params.page ?? base.page,
  };

  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.categorySlug) {
    query.set("category", next.categorySlug);
  }
  if (next.stock !== "all") {
    query.set("stock", next.stock);
  }
  if (next.sort !== "newest") {
    query.set("sort", next.sort);
  }
  if (next.tab !== "all") {
    query.set("tab", next.tab);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/products?${qs}` : "/admin/products";
}

export const PRODUCT_TAB_LABELS: Record<AdminProductTab, string> = {
  all: "All products",
  inhouse: "Inhouse products",
  drafts: "Drafts",
};

export const STOCK_FILTER_LABELS: Record<AdminStockFilter, string> = {
  all: "All stock",
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};
