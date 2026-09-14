import type { Metadata } from "next";
import { AdminEarningReport } from "@/features/admin/reports/admin-report-center-ui";
import {
  loadEarningReport,
  parseReportPeriod,
} from "@/lib/admin/load-report-center";
import { parseReportDateRange } from "@/lib/admin/report-time-buckets";
import type { AnalyticsSearchParams } from "@/lib/admin/analytics-list-params";

export const metadata: Metadata = {
  title: "Earning Report",
};

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) return raw[0] ?? "";
  return raw ?? "";
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const raw = await searchParams;
  const fromRaw = first(raw.from).trim();
  const toRaw = first(raw.to).trim();
  const customRange =
    fromRaw && toRaw ? parseReportDateRange(fromRaw, toRaw) : null;
  const period = parseReportPeriod(first(raw.period).trim());
  const data = await loadEarningReport(period, customRange ?? undefined);
  return (
    <AdminEarningReport
      data={data}
      period={period}
      customRange={
        customRange
          ? { from: fromRaw, to: toRaw }
          : fromRaw || toRaw
            ? { from: fromRaw, to: toRaw, invalid: true }
            : null
      }
    />
  );
}
