import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminHorizontalBars,
  AdminMiniBarChart,
} from "@/features/admin/analytics/admin-mini-bar-chart";
import type { AnalyticsSnapshot } from "@/lib/admin/analytics-mock";
import { analyticsHref } from "@/lib/admin/analytics-list-params";
import { formatMoney } from "@/lib/format/currency";
import { cn } from "@/lib/cn";

const PERIOD_OPTIONS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
] as const;

function ChangeIcon({
  direction,
}: {
  direction: AnalyticsSnapshot["kpis"][number]["changeDirection"];
}) {
  if (direction === "up") {
    return <ArrowUpRight className="size-3.5 text-success" aria-hidden />;
  }
  if (direction === "down") {
    return <ArrowDownRight className="size-3.5 text-danger" aria-hidden />;
  }
  return <Minus className="size-3.5 text-text-muted" aria-hidden />;
}

export function AdminAnalyticsDashboard({
  data,
}: {
  data: AnalyticsSnapshot;
}) {
  const trendBars = data.trend.map((point) => ({
    label: point.label,
    value: point.orders,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Analytics
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Storefront performance — {data.periodLabel}. Mock metrics for UI
            review.
          </p>
        </div>
        <p className="text-caption text-text-muted">{data.generatedAtLabel}</p>
      </div>

      <Alert tone="info" title="Display-only analytics">
        <p className="text-caption">
          Sessions, conversion, and revenue figures are mocked. Live GA4/GTM
          integration arrives in Phase 15.
        </p>
      </Alert>

      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Link
            key={option.value}
            href={analyticsHref({ period: option.value })}
            className={cn(
              buttonClassName({
                variant: data.period === option.value ? "primary" : "secondary",
                size: "sm",
              }),
            )}
          >
            {option.label}
          </Link>
        ))}
        <Link
          href="/admin/reports"
          className={buttonClassName({ variant: "ghost", size: "sm" })}
        >
          Open reports →
        </Link>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((kpi) => (
          <li
            key={kpi.id}
            className="rounded-md border border-border bg-surface p-4"
          >
            <p className="text-caption font-medium text-text-muted">
              {kpi.label}
            </p>
            <p className="mt-1 tabular-nums text-2xl font-semibold text-text">
              {kpi.value}
            </p>
            <p className="mt-1 flex items-center gap-1 text-caption text-text-muted">
              <ChangeIcon direction={kpi.changeDirection} />
              {kpi.changeLabel}
            </p>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-label font-semibold text-text">Orders trend</h2>
          <p className="mt-1 text-caption text-text-muted">
            Daily order volume for {data.periodLabel.toLowerCase()}.
          </p>
          <div className="mt-6">
            <AdminMiniBarChart items={trendBars} />
          </div>
        </section>

        <section className="rounded-md border border-border bg-surface p-4">
          <h2 className="text-label font-semibold text-text">Revenue trend</h2>
          <p className="mt-1 text-caption text-text-muted">
            Mock revenue by period bucket.
          </p>
          <ul className="mt-4 space-y-2">
            {data.trend.map((point) => (
              <li
                key={point.label}
                className="flex items-center justify-between gap-2 text-caption"
              >
                <span className="text-text-muted">{point.label}</span>
                <span className="font-medium tabular-nums text-text">
                  {formatMoney(point.revenue)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="rounded-md border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-label font-semibold text-text">
              Top products
            </h2>
            <p className="text-caption text-text-muted">
              By revenue for {data.periodLabel.toLowerCase()}.
            </p>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Product</TableHeader>
                <TableHeader className="text-right">Units</TableHeader>
                <TableHeader className="text-right">Revenue</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.topProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <p className="font-medium text-text">{product.name}</p>
                    <p className="font-mono text-caption text-text-muted">
                      {product.sku}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {product.unitsSold}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(product.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        <div className="space-y-6">
          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="text-label font-semibold text-text">
              Traffic sources
            </h2>
            <AdminHorizontalBars
              className="mt-4"
              items={data.trafficSources.map((item) => ({
                label: item.source,
                value: item.sessions,
                sharePercent: item.sharePercent,
              }))}
            />
          </section>

          <section className="rounded-md border border-border bg-surface p-4">
            <h2 className="text-label font-semibold text-text">Devices</h2>
            <AdminHorizontalBars
              className="mt-4"
              items={data.deviceSplit.map((item) => ({
                label: item.device,
                value: item.sessions,
                sharePercent: item.sharePercent,
              }))}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
