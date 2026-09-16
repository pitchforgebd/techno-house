/**
 * Dashboard revenue trend — a period an operator picks, not a fixed window.
 *
 * The dashboard used to hardcode "last 14 days" with no way to change it.
 * This is the same real accounting Report Center already does
 * (`lib/admin/report-time-buckets.ts`), scoped down to exactly what a small
 * dashboard card needs: a bucketed series, a period total, and a comparison
 * against the immediately preceding period of equal length — nothing else,
 * so this stays two lightweight queries next to Report Center's much heavier
 * per-channel/per-brand breakdown.
 *
 * "15 days" is not a `ReportPeriod` (`today` | `week` | `month` | `all`) — it
 * is specific to this card, so it is kept as this module's own type instead
 * of widening the shared one that six existing report pages depend on.
 */
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";
import {
  fillBuckets,
  parseReportDateRange,
  planCustomRangeBuckets,
  planReportBuckets,
  type ReportBucketPlan,
} from "@/lib/admin/report-time-buckets";

export type DashboardTrendRange = "today" | "week" | "15days" | "month";

const RANGE_LABEL: Record<DashboardTrendRange, string> = {
  today: "Today",
  week: "Last 7 days",
  "15days": "Last 15 days",
  month: "This month",
};

/** Defaults to "today" for anything unrecognised — the dashboard's default view. */
export function parseDashboardTrendRange(raw: string): DashboardTrendRange {
  if (raw === "today" || raw === "week" || raw === "15days" || raw === "month") {
    return raw;
  }
  return "today";
}

function fifteenDayRange(now: Date): { from: Date; to: Date } {
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = new Date(todayUtc.getTime() - 14 * 24 * 60 * 60 * 1000);
  return { from, to: todayUtc };
}

function resolvePlan(
  range: DashboardTrendRange,
  customRange: { from: Date; to: Date } | undefined,
  now: Date,
): ReportBucketPlan {
  if (customRange) {
    return planCustomRangeBuckets(customRange.from, customRange.to);
  }
  if (range === "15days") {
    const { from, to } = fifteenDayRange(now);
    return planCustomRangeBuckets(from, to);
  }
  // "today" | "week" | "month" map onto the existing Report Center periods.
  return planReportBuckets(range);
}

/**
 * The window immediately before the current one, same length. Generic by
 * construction — works identically for an hour-bucketed "today", a
 * day-bucketed "week"/"15 days", a month-bucketed custom year, or any
 * operator-picked date range. This is what the growth badge compares against;
 * "vs last month" would be nonsense while looking at a single day.
 */
function previousEqualWindow(start: Date, end: Date): { start: Date; end: Date } {
  const length = end.getTime() - start.getTime();
  return { start: new Date(start.getTime() - length), end: start };
}

export type DashboardTrendResult = {
  range: DashboardTrendRange;
  rangeLabel: string;
  /** True when `from`/`to` were supplied but did not parse — fell back to `range`. */
  customRangeInvalid: boolean;
  trend: { label: string; value: number }[];
  totalAmount: number;
  orderCount: number;
  /** Null when the previous window had no paid sales — nothing to compare against. */
  growthPercent: number | null;
};

function emptyResult(
  range: DashboardTrendRange,
  invalid: boolean,
): DashboardTrendResult {
  return {
    range,
    rangeLabel: RANGE_LABEL[range],
    customRangeInvalid: invalid,
    trend: [],
    totalAmount: 0,
    orderCount: 0,
    growthPercent: null,
  };
}

/**
 * @param range Which of the four quick-pick options is selected. Ignored
 *   when `customFrom`/`customTo` parse successfully — the explicit range wins.
 * @param customFrom `YYYY-MM-DD`, or empty/omitted for none.
 * @param customTo `YYYY-MM-DD`, or empty/omitted for none.
 */
export async function loadDashboardTrend(
  range: DashboardTrendRange,
  customFrom?: string,
  customTo?: string,
): Promise<DashboardTrendResult> {
  const parsedCustom =
    customFrom && customTo ? parseReportDateRange(customFrom, customTo) : null;
  // Only "provided but unparseable" counts as invalid — omitted entirely is
  // just "use the quick-pick range", not an error to surface.
  const customRangeInvalid = Boolean(customFrom && customTo) && parsedCustom === null;

  if (!usesDatabase()) {
    return emptyResult(range, customRangeInvalid);
  }

  const now = new Date();
  const plan = resolvePlan(range, parsedCustom ?? undefined, now);
  const previous = previousEqualWindow(plan.start, plan.end);
  const prisma = getPrisma();

  const [trendRows, currentAgg, currentCount, previousAgg] = await Promise.all([
    prisma.$queryRaw<{ bucket: Date; total: number }[]>`
      SELECT date_trunc(${plan.granularity}, "placedAt") AS bucket,
             COALESCE(SUM("totalAmount"), 0)::float8 AS total
      FROM "Order"
      WHERE "paymentStatus" = 'PAID'
        AND "placedAt" >= ${plan.start} AND "placedAt" < ${plan.end}
      GROUP BY bucket
    `,
    prisma.order.aggregate({
      where: { paymentStatus: "PAID", placedAt: { gte: plan.start, lt: plan.end } },
      _sum: { totalAmount: true },
    }),
    prisma.order.count({
      where: { paymentStatus: "PAID", placedAt: { gte: plan.start, lt: plan.end } },
    }),
    prisma.order.aggregate({
      where: {
        paymentStatus: "PAID",
        placedAt: { gte: previous.start, lt: previous.end },
      },
      _sum: { totalAmount: true },
    }),
  ]);

  const totalAmount = currentAgg._sum.totalAmount ?? 0;
  const previousAmount = previousAgg._sum.totalAmount ?? 0;
  const growthPercent =
    previousAmount > 0
      ? Math.round(((totalAmount - previousAmount) / previousAmount) * 1000) / 10
      : null;

  return {
    range,
    rangeLabel: parsedCustom
      ? `${customFrom} to ${customTo}`
      : RANGE_LABEL[range],
    customRangeInvalid,
    trend: fillBuckets(plan, trendRows),
    totalAmount,
    orderCount: currentCount,
    growthPercent,
  };
}
