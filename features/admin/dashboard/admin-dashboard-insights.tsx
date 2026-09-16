import Link from "next/link";
import { Search, TrendingUp } from "lucide-react";
import {
  AdminDashboardCard,
  AdminStatIcon,
} from "@/features/admin/dashboard/admin-dashboard-widgets";
import type { ReportNamedCount } from "@/lib/admin/load-report-center";
import type { UserSearchRow } from "@/lib/admin/report-center-mock";

/**
 * "Which products are selling, which are being searched for" — the two
 * questions a merchandiser actually asks the dashboard. Both reuse Report
 * Center's own data functions (`loadProductSaleRows`, `loadUserSearches`)
 * rather than a second query for the same numbers; each card is a top-5 with
 * a link to that report's full table.
 *
 * `SearchLog` records the raw query text a shopper typed, not a specific
 * product — "gaming mouse" is not one SKU. The panel is labelled "Top search
 * terms" rather than "Most-searched products" so it never claims more
 * precision than the underlying data has.
 */

function ProgressRow({
  rank,
  label,
  value,
  valueLabel,
  shareOfMax,
}: {
  rank: number;
  label: string;
  value: number;
  valueLabel: string;
  shareOfMax: number;
}) {
  return (
    <li>
      <div className="mb-1 flex items-center justify-between gap-2 text-caption">
        <span className="flex min-w-0 items-center gap-2 text-text">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-text-muted">
            {rank}
          </span>
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 tabular-nums font-semibold text-text">
          {valueLabel}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${Math.max(shareOfMax, value > 0 ? 3 : 0)}%` }}
        />
      </div>
    </li>
  );
}

export function AdminBestSellersPanel({
  rows,
}: {
  rows: ReportNamedCount[];
}) {
  const top = rows.filter((row) => row.value > 0).slice(0, 5);
  const max = Math.max(1, ...top.map((row) => row.value));

  return (
    <AdminDashboardCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AdminStatIcon tone="green">
            <TrendingUp className="size-6" aria-hidden />
          </AdminStatIcon>
          <div>
            <p className="text-caption text-text-muted">Best-selling products</p>
            <p className="text-caption text-text-muted">by units sold, all-time</p>
          </div>
        </div>
        <Link
          href="/admin/reports/product-sales"
          className="text-caption font-medium text-blue-600 hover:underline"
        >
          Full report →
        </Link>
      </div>
      {top.length > 0 ? (
        <ul className="space-y-3">
          {top.map((row, index) => (
            <ProgressRow
              key={row.id}
              rank={index + 1}
              label={row.name}
              value={row.value}
              valueLabel={`${row.value} sold`}
              shareOfMax={(row.value / max) * 100}
            />
          ))}
        </ul>
      ) : (
        <p className="text-caption text-text-muted">No paid orders yet.</p>
      )}
    </AdminDashboardCard>
  );
}

export function AdminTopSearchesPanel({
  rows,
}: {
  rows: UserSearchRow[];
}) {
  const top = rows.slice(0, 5);
  const max = Math.max(1, ...top.map((row) => row.count));

  return (
    <AdminDashboardCard>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AdminStatIcon tone="purple">
            <Search className="size-6" aria-hidden />
          </AdminStatIcon>
          <div>
            <p className="text-caption text-text-muted">Top search terms</p>
            <p className="text-caption text-text-muted">what shoppers type in Search</p>
          </div>
        </div>
        <Link
          href="/admin/reports/searches"
          className="text-caption font-medium text-blue-600 hover:underline"
        >
          Full report →
        </Link>
      </div>
      {top.length > 0 ? (
        <ul className="space-y-3">
          {top.map((row, index) => (
            <ProgressRow
              key={row.id}
              rank={index + 1}
              label={row.query}
              value={row.count}
              valueLabel={`${row.count}×`}
              shareOfMax={(row.count / max) * 100}
            />
          ))}
        </ul>
      ) : (
        <p className="text-caption text-text-muted">No searches logged yet.</p>
      )}
    </AdminDashboardCard>
  );
}
