import type { CampaignStatus } from "@/lib/admin/marketing-mock";
import type { CouponAdminStatus } from "@/lib/admin/marketing-mock";

export const ADMIN_MARKETING_PAGE_SIZE = 8;

export type MarketingListParams = {
  q: string;
  status: "all" | CampaignStatus;
  page: number;
};

export type CouponListParams = {
  q: string;
  status: "all" | CouponAdminStatus;
  page: number;
};

export type MarketingSearchParams = Record<
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

const CAMPAIGN_STATUSES = new Set([
  "all",
  "draft",
  "scheduled",
  "active",
  "paused",
  "ended",
]);

const COUPON_STATUSES = new Set([
  "all",
  "active",
  "scheduled",
  "expired",
  "disabled",
]);

export function parseMarketingListParams(
  searchParams: MarketingSearchParams,
): MarketingListParams {
  const statusRaw = first(searchParams.status).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    status: (CAMPAIGN_STATUSES.has(statusRaw)
      ? statusRaw
      : "all") as MarketingListParams["status"],
    page: parsePage(first(searchParams.page)),
  };
}

export function parseCouponListParams(
  searchParams: MarketingSearchParams,
): CouponListParams {
  const statusRaw = first(searchParams.status).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    status: (COUPON_STATUSES.has(statusRaw)
      ? statusRaw
      : "all") as CouponListParams["status"],
    page: parsePage(first(searchParams.page)),
  };
}

export function marketingHref(
  basePath: string,
  params: Partial<MarketingListParams> & { base?: MarketingListParams },
): string {
  const base = params.base ?? { q: "", status: "all" as const, page: 1 };
  const next = {
    q: params.q ?? base.q,
    status: params.status ?? base.status,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.status !== "all") {
    query.set("status", next.status);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function couponsHref(
  params: Partial<CouponListParams> & { base?: CouponListParams },
): string {
  const base = params.base ?? { q: "", status: "all" as const, page: 1 };
  const next = {
    q: params.q ?? base.q,
    status: params.status ?? base.status,
    page: params.page ?? base.page,
  };
  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.status !== "all") {
    query.set("status", next.status);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `/admin/coupons?${qs}` : "/admin/coupons";
}
