export const ADMIN_CUSTOMER_PAGE_SIZE = 8;

export type AdminCustomerTab =
  | "all"
  | "banned"
  | "suspicious"
  | "verified"
  | "unverified";

export type AdminCustomerListParams = {
  q: string;
  tab: AdminCustomerTab;
  page: number;
};

export type AdminCustomerSearchParams = Record<
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

function isTab(value: string): value is AdminCustomerTab {
  return (
    value === "all" ||
    value === "banned" ||
    value === "suspicious" ||
    value === "verified" ||
    value === "unverified"
  );
}

export function parseAdminCustomerListParams(
  searchParams: AdminCustomerSearchParams,
): AdminCustomerListParams {
  const tabRaw = first(searchParams.tab).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    tab: isTab(tabRaw) ? tabRaw : "all",
    page: parsePage(first(searchParams.page)),
  };
}

export function adminCustomersHref(
  params: Partial<AdminCustomerListParams> & {
    base?: AdminCustomerListParams;
  },
): string {
  const base: AdminCustomerListParams = params.base ?? {
    q: "",
    tab: "all",
    page: 1,
  };
  const next: AdminCustomerListParams = {
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
  return qs ? `/admin/customers?${qs}` : "/admin/customers";
}

export const CUSTOMER_TAB_LABELS: Record<AdminCustomerTab, string> = {
  all: "All customers",
  banned: "Banned",
  suspicious: "Suspicious",
  verified: "Verified",
  unverified: "Unverified",
};
