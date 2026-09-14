/**
 * Date-wise / month-wise bucketing for Report Center (AD-270).
 *
 * All boundaries are UTC, matching the existing month-start convention in
 * lib/admin/load-dashboard.ts — kept consistent rather than introducing a
 * second timezone convention just for this report.
 */
import type { ReportPeriod } from "@/lib/admin/report-center-mock";

export type ReportGranularity = "hour" | "day" | "month";

export type ReportBucketPlan = {
  granularity: ReportGranularity;
  start: Date;
  end: Date;
  keys: string[];
  labels: string[];
};

function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function bucketKey(date: Date, granularity: ReportGranularity): string {
  const d = date instanceof Date ? date : new Date(date);
  if (granularity === "month") {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (granularity === "day") {
    return d.toISOString().slice(0, 10);
  }
  return d.toISOString().slice(0, 13);
}

const HOUR_FORMAT = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
const DAY_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "UTC",
});
const MONTH_FORMAT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function planReportBuckets(
  period: ReportPeriod,
  now: Date = new Date(),
): ReportBucketPlan {
  if (period === "today") {
    const start = utcDayStart(now);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const keys: string[] = [];
    const labels: string[] = [];
    for (let h = 0; h < 24; h += 1) {
      const point = new Date(start.getTime() + h * 60 * 60 * 1000);
      keys.push(bucketKey(point, "hour"));
      labels.push(HOUR_FORMAT.format(point));
    }
    return { granularity: "hour", start, end, keys, labels };
  }

  if (period === "week") {
    const todayStart = utcDayStart(now);
    const start = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);
    const end = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const keys: string[] = [];
    const labels: string[] = [];
    for (let d = 0; d < 7; d += 1) {
      const point = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
      keys.push(bucketKey(point, "day"));
      labels.push(DAY_FORMAT.format(point));
    }
    return { granularity: "day", start, end, keys, labels };
  }

  if (period === "month") {
    const start = utcMonthStart(now);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    const daysInMonth = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    const keys: string[] = [];
    const labels: string[] = [];
    for (let d = 0; d < daysInMonth; d += 1) {
      const point = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
      keys.push(bucketKey(point, "day"));
      labels.push(DAY_FORMAT.format(point));
    }
    return { granularity: "day", start, end, keys, labels };
  }

  // "all" — last 12 real calendar months, oldest first.
  const currentMonthStart = utcMonthStart(now);
  const start = new Date(
    Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 11, 1),
  );
  const end = new Date(
    Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() + 1, 1),
  );
  const keys: string[] = [];
  const labels: string[] = [];
  for (let m = 0; m < 12; m += 1) {
    const point = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + m, 1));
    keys.push(bucketKey(point, "month"));
    labels.push(MONTH_FORMAT.format(point));
  }
  return { granularity: "month", start, end, keys, labels };
}

/** Custom date-range reports stay readable — cap at a full year. */
export const MAX_CUSTOM_RANGE_DAYS = 366;
/** Beyond this many days, bucket by month instead of by day. */
const DAILY_BUCKET_DAY_LIMIT = 92;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parses two `YYYY-MM-DD` inputs into a validated UTC day range (inclusive of `to`). */
export function parseReportDateRange(
  fromRaw: string,
  toRaw: string,
): { from: Date; to: Date } | null {
  const from = fromRaw.trim();
  const to = toRaw.trim();
  if (!DATE_ONLY.test(from) || !DATE_ONLY.test(to)) {
    return null;
  }
  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    return null;
  }
  if (fromDate.getTime() > toDate.getTime()) {
    return null;
  }
  const days = Math.round((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  if (days > MAX_CUSTOM_RANGE_DAYS) {
    return null;
  }
  return { from: fromDate, to: toDate };
}

/**
 * Real date-wise accounting for any custom range — a single day, 4 days, or
 * up to a year. Daily buckets while the range is short enough to stay
 * readable; monthly buckets for longer ranges.
 */
export function planCustomRangeBuckets(from: Date, to: Date): ReportBucketPlan {
  const start = utcDayStart(from);
  const inclusiveEnd = new Date(utcDayStart(to).getTime() + 24 * 60 * 60 * 1000);
  const days = Math.max(
    1,
    Math.round((inclusiveEnd.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
  );

  if (days <= DAILY_BUCKET_DAY_LIMIT) {
    const keys: string[] = [];
    const labels: string[] = [];
    for (let d = 0; d < days; d += 1) {
      const point = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
      keys.push(bucketKey(point, "day"));
      labels.push(DAY_FORMAT.format(point));
    }
    return { granularity: "day", start, end: inclusiveEnd, keys, labels };
  }

  const startMonth = utcMonthStart(start);
  const lastDay = new Date(inclusiveEnd.getTime() - 24 * 60 * 60 * 1000);
  const endMonth = utcMonthStart(lastDay);
  const monthCount =
    (endMonth.getUTCFullYear() - startMonth.getUTCFullYear()) * 12 +
    (endMonth.getUTCMonth() - startMonth.getUTCMonth()) +
    1;
  const keys: string[] = [];
  const labels: string[] = [];
  for (let m = 0; m < monthCount; m += 1) {
    const point = new Date(Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + m, 1));
    keys.push(bucketKey(point, "month"));
    labels.push(MONTH_FORMAT.format(point));
  }
  const end = new Date(
    Date.UTC(startMonth.getUTCFullYear(), startMonth.getUTCMonth() + monthCount, 1),
  );
  return { granularity: "month", start: startMonth, end, keys, labels };
}

export function currentCalendarMonthRange(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = utcMonthStart(now);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start, end };
}

/** Fills every planned bucket with 0 unless a real row supplied a value. */
export function fillBuckets(
  plan: ReportBucketPlan,
  rows: { bucket: Date; total: number }[],
): { label: string; value: number }[] {
  const byKey = new Map<string, number>();
  for (const row of rows) {
    byKey.set(bucketKey(row.bucket, plan.granularity), row.total);
  }
  return plan.keys.map((key, index) => ({
    label: plan.labels[index] ?? key,
    value: byKey.get(key) ?? 0,
  }));
}
