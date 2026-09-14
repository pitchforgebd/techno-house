export const ADMIN_REVIEW_PAGE_SIZE = 10;

export type AdminReviewTab = "all" | "custom";
export type AdminReviewSort = "rating_desc" | "rating_asc" | "reviews_desc";

export type AdminReviewListParams = {
  q: string;
  tab: AdminReviewTab;
  categorySlug: string | null;
  sort: AdminReviewSort;
  page: number;
};

export type AdminReviewSearchParams = Record<
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

function isTab(value: string): value is AdminReviewTab {
  return value === "all" || value === "custom";
}

function isSort(value: string): value is AdminReviewSort {
  return (
    value === "rating_desc" ||
    value === "rating_asc" ||
    value === "reviews_desc"
  );
}

export function parseAdminReviewListParams(
  searchParams: AdminReviewSearchParams,
): AdminReviewListParams {
  const tabRaw = first(searchParams.tab).trim() || "all";
  const sortRaw = first(searchParams.sort).trim() || "rating_desc";
  const category = first(searchParams.category).trim();

  return {
    q: first(searchParams.q).trim().slice(0, 120),
    tab: isTab(tabRaw) ? tabRaw : "all",
    categorySlug: category || null,
    sort: isSort(sortRaw) ? sortRaw : "rating_desc",
    page: parsePage(first(searchParams.page)),
  };
}

export function adminReviewsHref(
  params: Partial<AdminReviewListParams> & {
    base?: AdminReviewListParams;
  },
): string {
  const base: AdminReviewListParams = params.base ?? {
    q: "",
    tab: "all",
    categorySlug: null,
    sort: "rating_desc",
    page: 1,
  };
  const next: AdminReviewListParams = {
    q: params.q ?? base.q,
    tab: params.tab ?? base.tab,
    categorySlug:
      params.categorySlug === undefined
        ? base.categorySlug
        : params.categorySlug,
    sort: params.sort ?? base.sort,
    page: params.page ?? base.page,
  };

  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.tab !== "all") {
    query.set("tab", next.tab);
  }
  if (next.categorySlug) {
    query.set("category", next.categorySlug);
  }
  if (next.sort !== "rating_desc") {
    query.set("sort", next.sort);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/reviews?${qs}` : "/admin/reviews";
}

export const REVIEW_TAB_LABELS: Record<AdminReviewTab, string> = {
  all: "All reviews",
  custom: "Custom reviews",
};

export const REVIEW_SORT_LABELS: Record<AdminReviewSort, string> = {
  rating_desc: "Sort by rating",
  rating_asc: "Lowest rating",
  reviews_desc: "Most reviews",
};
