export type AdminLabelTab = "all" | "inhouse";

export type AdminLabelListParams = {
  q: string;
  tab: AdminLabelTab;
  page: number;
};

export type AdminLabelSearchParams = Record<
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

function isTab(value: string): value is AdminLabelTab {
  return value === "all" || value === "inhouse";
}

export function parseAdminLabelListParams(
  searchParams: AdminLabelSearchParams,
): AdminLabelListParams {
  const tabRaw = first(searchParams.tab).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    tab: isTab(tabRaw) ? tabRaw : "all",
    page: parsePage(first(searchParams.page)),
  };
}

export function adminLabelsHref(
  params: Partial<AdminLabelListParams> & {
    base?: AdminLabelListParams;
  },
): string {
  const base: AdminLabelListParams = params.base ?? {
    q: "",
    tab: "all",
    page: 1,
  };
  const next: AdminLabelListParams = {
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
  return qs ? `/admin/labels?${qs}` : "/admin/labels";
}

export const LABEL_TAB_LABELS: Record<AdminLabelTab, string> = {
  all: "All custom labels",
  inhouse: "In house",
};
