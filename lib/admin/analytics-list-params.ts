import type { AnalyticsPeriod } from "@/lib/admin/analytics-mock";

export type AnalyticsSearchParams = Record<
  string,
  string | string[] | undefined
>;

export type AnalyticsParams = {
  period: AnalyticsPeriod;
};

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

const PERIODS = new Set(["7d", "30d", "90d"]);

export function parseAnalyticsParams(
  searchParams: AnalyticsSearchParams,
): AnalyticsParams {
  const periodRaw = first(searchParams.period).trim() || "30d";
  return {
    period: (PERIODS.has(periodRaw) ? periodRaw : "30d") as AnalyticsPeriod,
  };
}

export function analyticsHref(params: Partial<AnalyticsParams>): string {
  const period = params.period ?? "30d";
  if (period === "30d") {
    return "/admin/analytics";
  }
  return `/admin/analytics?period=${period}`;
}
