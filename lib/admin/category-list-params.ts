export const ADMIN_CATEGORY_PAGE_SIZE = 12;

export type AdminCategoryTab = "all" | "root" | "sub";

export type AdminCategoryListParams = {
  q: string;
  tab: AdminCategoryTab;
  page: number;
};

export type AdminCategorySearchParams = Record<
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

function isCategoryTab(value: string): value is AdminCategoryTab {
  return value === "all" || value === "root" || value === "sub";
}

export function parseAdminCategoryListParams(
  searchParams: AdminCategorySearchParams,
): AdminCategoryListParams {
  const tabRaw = first(searchParams.tab).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    tab: isCategoryTab(tabRaw) ? tabRaw : "all",
    page: parsePage(first(searchParams.page)),
  };
}

export function adminCategoriesHref(
  params: Partial<AdminCategoryListParams> & {
    base?: AdminCategoryListParams;
  },
): string {
  const base: AdminCategoryListParams = params.base ?? {
    q: "",
    tab: "all",
    page: 1,
  };
  const next: AdminCategoryListParams = {
    q: params.q ?? base.q,
    tab: params.tab ?? base.tab,
    page: params.page ?? base.page,
  };

  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.tab !== "all") {
    query.set("tab", next.tab);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/categories?${qs}` : "/admin/categories";
}

export const CATEGORY_TAB_LABELS: Record<AdminCategoryTab, string> = {
  all: "All categories",
  root: "Root categories",
  sub: "Subcategories",
};
