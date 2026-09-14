export const ADMIN_BRAND_PAGE_SIZE = 10;

export type AdminBrandTab = "all" | "unused";

export type AdminBrandListParams = {
  q: string;
  tab: AdminBrandTab;
  page: number;
};

export type AdminBrandSearchParams = Record<
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

function isBrandTab(value: string): value is AdminBrandTab {
  return value === "all" || value === "unused";
}

export function parseAdminBrandListParams(
  searchParams: AdminBrandSearchParams,
): AdminBrandListParams {
  const tabRaw = first(searchParams.tab).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    tab: isBrandTab(tabRaw) ? tabRaw : "all",
    page: parsePage(first(searchParams.page)),
  };
}

export function adminBrandsHref(
  params: Partial<AdminBrandListParams> & {
    base?: AdminBrandListParams;
  },
): string {
  const base: AdminBrandListParams = params.base ?? {
    q: "",
    tab: "all",
    page: 1,
  };
  const next: AdminBrandListParams = {
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
  return qs ? `/admin/brands?${qs}` : "/admin/brands";
}

export const BRAND_TAB_LABELS: Record<AdminBrandTab, string> = {
  all: "All brands",
  unused: "Unused brands",
};
