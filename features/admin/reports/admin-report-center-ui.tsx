"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Grid2x2, Tag, Users } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { ReportCsvExportButton } from "@/features/admin/reports/report-csv-export";
import type { EarningReportSnapshot } from "@/lib/admin/load-report-center";
import type { ReportPeriod } from "@/lib/admin/report-center-mock";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

/**
 * Defined here rather than imported from the report loader: that module reaches
 * the data layer, and a value import would pull the database client into the
 * browser bundle.
 */
function formatReportMoney(amount: number): string {
  return formatMoney({ amount });
}

const PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];

const PINK = "#e91e63";

export function ReportPeriodTabs({
  value,
  hrefFor,
}: {
  value: ReportPeriod;
  hrefFor: (period: ReportPeriod) => string;
}) {
  return (
    <nav
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label="Period"
    >
      {PERIODS.map((period) => {
        const active = value === period.id;
        return (
          <Link
            key={period.id}
            href={hrefFor(period.id)}
            className={cn(
              "rounded-md px-2.5 py-1 font-medium",
              active ? "text-white" : "text-neutral-500 hover:text-neutral-800",
            )}
            style={active ? { backgroundColor: PINK } : undefined}
            aria-current={active ? "page" : undefined}
          >
            {period.label}
          </Link>
        );
      })}
    </nav>
  );
}

export type EarningReportCustomRange =
  | { from: string; to: string; invalid?: false }
  | { from: string; to: string; invalid: true };

const dateInputClass =
  "h-9 rounded-md border border-neutral-200 bg-white px-2.5 text-sm text-text shadow-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function ReportDateRangeForm({
  customRange,
}: {
  customRange: EarningReportCustomRange | null;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(customRange?.from ?? "");
  const [to, setTo] = useState(customRange?.to ?? "");

  return (
    <section className="rounded-xl border border-neutral-200/80 bg-white p-4 shadow-sm">
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!from || !to) return;
          router.push(`/admin/reports?from=${from}&to=${to}`);
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">From date</span>
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
            className={dateInputClass}
            aria-label="From date"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">To date</span>
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
            className={dateInputClass}
            aria-label="To date"
          />
        </label>
        <button
          type="submit"
          disabled={!from || !to}
          className="h-9 rounded-md bg-[#3897f0] px-4 text-sm font-medium text-white hover:bg-[#2f86d8] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Show this range
        </button>
        {customRange ? (
          <Link
            href="/admin/reports"
            className="h-9 rounded-md border border-neutral-200 px-4 text-sm font-medium leading-9 text-neutral-600 hover:bg-neutral-50"
          >
            Clear
          </Link>
        ) : null}
        <span className="text-xs text-neutral-400">
          Pick any single day or a range (up to a year) for exact date-wise
          accounting — separate from the Today/Week/Month/All tabs below.
        </span>
      </form>
      {customRange?.invalid ? (
        <p className="mt-2 text-sm font-medium text-red-600">
          That date range isn&apos;t valid — check the dates are in order and
          within a year of each other.
        </p>
      ) : customRange ? (
        <p className="mt-2 text-sm font-medium text-emerald-600">
          Showing {customRange.from} to {customRange.to}.
        </p>
      ) : null}
    </section>
  );
}

export function AdminEarningReport({
  data,
  period,
  customRange,
}: {
  data: EarningReportSnapshot;
  period: ReportPeriod;
  customRange: EarningReportCustomRange | null;
}) {
  const hrefFor = (next: ReportPeriod) =>
    next === "all" ? "/admin/reports" : `/admin/reports?period=${next}`;

  const summaryHeaders = ["Metric", "Value"];
  const summaryRows: (string | number)[][] = [
    ["Period", period],
    ["Total sales (paid orders)", data.totalSales],
    ["Sales this calendar month", data.salesThisMonth],
    ["Refunds (completed)", data.refunds],
    ["Refunds this calendar month", data.refundsThisMonth],
    ["Paid order count", data.orderCount],
    ["Average order value", data.averageOrderValue],
    ["Total categories", data.categoryCount],
    ["Total brands", data.brandCount],
    ["Top brand by revenue", data.topBrand],
    ...data.netSales.map((row) => [`Net sales — ${row.label}`, row.value]),
    ...data.expenses.map((row) => [`Refunds — ${row.label}`, row.value]),
  ];
  const seriesHeaders = ["Bucket", "Sales", "Refunds"];
  const seriesRows: (string | number)[][] = data.saleSeries.map((point, i) => [
    point.label,
    point.value,
    data.refundSeries[i]?.value ?? 0,
  ]);
  const rangeSuffix = customRange
    ? `${customRange.from}_to_${customRange.to}`
    : period;

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Earning Report
        </h1>
        <div className="flex flex-wrap gap-2">
          <ReportCsvExportButton
            filename={`earning-report-summary-${rangeSuffix}-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={summaryHeaders}
            rows={summaryRows}
            label="Export summary CSV"
          />
          <ReportCsvExportButton
            filename={`earning-report-series-${rangeSuffix}-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={seriesHeaders}
            rows={seriesRows}
            label="Export time series CSV"
          />
        </div>
      </div>

      <ReportDateRangeForm customRange={customRange} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          value={formatReportMoney(data.totalSales)}
          label="Total Sales (selected period)"
          icon={<Users className="size-8 text-neutral-300" aria-hidden />}
          bannerLabel="Sales this month"
          bannerValue={formatReportMoney(data.salesThisMonth)}
          bannerClass="bg-[#3897f0]"
        />
        <KpiCard
          value={formatReportMoney(data.refunds)}
          label="Refunds (completed)"
          icon={<Users className="size-8 text-neutral-300" aria-hidden />}
          bannerLabel="Refunds this month"
          bannerValue={formatReportMoney(data.refundsThisMonth)}
          bannerClass="bg-[#e91e63]"
        />
        <KpiCard
          value={String(data.orderCount)}
          label="Paid Orders (selected period)"
          hint={`Avg order value · ${formatReportMoney(data.averageOrderValue)}`}
          icon={<Users className="size-8 text-neutral-300" aria-hidden />}
        />
        <KpiCard
          value={String(data.categoryCount)}
          label="Total Category"
          icon={<Grid2x2 className="size-8 text-neutral-300" aria-hidden />}
        />
        <KpiCard
          value={String(data.brandCount)}
          label="Total Brands"
          hint={`Top Brand by revenue · ${data.topBrand}`}
          icon={<Tag className="size-8 text-neutral-300" aria-hidden />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          title="Net Sales"
          subtitle="By Sale Category"
          period={period}
          hrefFor={hrefFor}
        >
          <HorizontalBarChart items={data.netSales} />
        </ChartCard>
        <ChartCard
          title="Refunds"
          subtitle="By Expense Category"
          period={period}
          hrefFor={hrefFor}
        >
          <HorizontalBarChart items={data.expenses} />
        </ChartCard>
        <ChartCard title="Sale Analytics" period={period} hrefFor={hrefFor}>
          <LineChart values={data.saleSeries} />
        </ChartCard>
        <ChartCard title="Refunds Analytics" period={period} hrefFor={hrefFor}>
          <LineChart values={data.refundSeries} />
        </ChartCard>
      </div>
    </div>
  );
}

function KpiCard({
  value,
  label,
  hint,
  icon,
  bannerLabel,
  bannerValue,
  bannerClass,
}: {
  value: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  bannerLabel?: string;
  bannerValue?: string;
  bannerClass?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tabular-nums text-neutral-900">
            {value}
          </p>
          <p className="mt-1 text-sm text-neutral-500">{label}</p>
          {hint ? (
            <p className="mt-1 text-xs text-neutral-400">{hint}</p>
          ) : null}
        </div>
        {icon}
      </div>
      {bannerLabel && bannerValue ? (
        <div
          className={cn(
            "mt-4 flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white",
            bannerClass,
          )}
        >
          <span>{bannerLabel}</span>
          <span className="font-medium tabular-nums">{bannerValue}</span>
        </div>
      ) : (
        <div className="mt-4 min-h-[2.25rem]" />
      )}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  period,
  hrefFor,
  children,
}: {
  title: string;
  subtitle?: string;
  period: ReportPeriod;
  hrefFor: (period: ReportPeriod) => string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
          {subtitle ? (
            <p className="text-sm text-neutral-400">{subtitle}</p>
          ) : null}
        </div>
        <ReportPeriodTabs value={period} hrefFor={hrefFor} />
      </div>
      {children}
    </section>
  );
}

function HorizontalBarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[8rem_minmax(0,1fr)] items-center gap-3"
        >
          <span className="truncate text-sm text-neutral-600">
            {item.label}
          </span>
          <div className="relative h-7 border-l border-dashed border-neutral-200">
            <div
              className="absolute inset-y-1 left-0 rounded-sm bg-[#3897f0]/80"
              style={{ width: `${Math.max(8, (item.value / max) * 100)}%` }}
              title={`${item.label}: ${item.value.toLocaleString()}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(...values.map((v) => v.value), 1);
  const w = 580;
  const h = 180;
  const pad = 28;
  const points = values
    .map((v, i) => {
      const x = pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2);
      const y = h - pad - (v.value / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  // Show at most ~8 labels regardless of point count, so 24/30/31-point
  // series stay readable instead of overlapping.
  const labelEvery = Math.max(1, Math.ceil(values.length / 8));

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-48 w-full text-neutral-300"
      role="img"
    >
      {Array.from({ length: 6 }, (_, i) => {
        const y = pad + (i / 5) * (h - pad * 2);
        return (
          <line
            key={i}
            x1={pad}
            x2={w - 8}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeDasharray="3 4"
          />
        );
      })}
      <polyline fill="none" stroke="#3897f0" strokeWidth="2" points={points} />
      {values.map((point, i) =>
        i % labelEvery === 0 || i === values.length - 1 ? (
          <text
            key={i}
            x={pad + (i / Math.max(values.length - 1, 1)) * (w - pad * 2)}
            y={h - 6}
            fontSize="9"
            fill="#9ca3af"
            textAnchor="middle"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}

const controlClass =
  "h-9 appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

export function AdminCategoryReportTable({
  title,
  valueHeader,
  secondaryHeader,
  secondaryValueType,
  rows,
  categories,
  categorySlug,
  actionPath,
  page,
  pageSize = 12,
  exportFilePrefix,
}: {
  title: string;
  valueHeader: string;
  secondaryHeader?: string;
  /** "money" prefixes the displayed (not exported) value with the currency symbol. */
  secondaryValueType?: "money" | "number";
  rows: { id: string; name: string; value: number; secondaryValue?: number }[];
  categories: { slug: string; name: string }[];
  categorySlug: string;
  actionPath: string;
  page: number;
  pageSize?: number;
  exportFilePrefix?: string;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(categorySlug);
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pageCount);
  const slice = rows.slice((safePage - 1) * pageSize, safePage * pageSize);
  const hasSecondary = Boolean(secondaryHeader);

  function hrefForPage(nextPage: number) {
    const q = new URLSearchParams();
    if (categorySlug) q.set("category", categorySlug);
    if (nextPage > 1) q.set("page", String(nextPage));
    const qs = q.toString();
    return qs ? `${actionPath}?${qs}` : actionPath;
  }

  const csvHeaders = ["#", "Product Name", valueHeader, ...(hasSecondary ? [secondaryHeader!] : [])];
  const csvRows: (string | number)[][] = rows.map((row, index) => [
    index + 1,
    row.name,
    row.value,
    ...(hasSecondary ? [row.secondaryValue ?? 0] : []),
  ]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          {title}
        </h1>
        {exportFilePrefix ? (
          <ReportCsvExportButton
            filename={`${exportFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`}
            headers={csvHeaders}
            rows={csvRows}
            label={`Export all ${total} rows CSV`}
          />
        ) : null}
      </div>
      <div className="rounded-xl border border-neutral-200/80 bg-white p-5 shadow-sm">
        <form
          className="mb-4 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const q = new URLSearchParams();
            if (category) q.set("category", category);
            const qs = q.toString();
            router.push(qs ? `${actionPath}?${qs}` : actionPath);
          }}
        >
          <span className="text-sm font-medium text-neutral-800">
            Sort by Category:
          </span>
          <select
            className={cn(controlClass, "min-w-[14rem]")}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Choose category"
          >
            <option value="">Choose Category</option>
            {categories.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 rounded-md bg-[#3897f0] px-4 text-sm font-medium text-white hover:bg-[#2f86d8]"
          >
            Filter
          </button>
        </form>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200">
                <th className="w-12 py-3 pr-3 font-semibold text-neutral-800">
                  #
                </th>
                <th className="py-3 pr-3 font-semibold text-neutral-800">
                  Product Name
                </th>
                <th className="py-3 text-right font-semibold text-neutral-800">
                  {valueHeader}
                </th>
                {hasSecondary ? (
                  <th className="py-3 pl-3 text-right font-semibold text-neutral-800">
                    {secondaryHeader}
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {slice.map((row, index) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-3 pr-3 tabular-nums text-neutral-500">
                    {(safePage - 1) * pageSize + index + 1}
                  </td>
                  <td className="py-3 pr-3 text-neutral-800">{row.name}</td>
                  <td className="py-3 text-right tabular-nums text-neutral-800">
                    {row.value}
                  </td>
                  {hasSecondary ? (
                    <td className="py-3 pl-3 text-right tabular-nums text-neutral-800">
                      {secondaryValueType === "money"
                        ? `৳ ${(row.secondaryValue ?? 0).toLocaleString("en-US")}`
                        : (row.secondaryValue ?? 0)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 ? (
          <div className="mt-4">
            <Pagination
              page={safePage}
              pageCount={pageCount}
              hrefForPage={hrefForPage}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
