import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminCampaignFilters } from "@/features/admin/marketing/admin-campaign-filters";
import { CampaignStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import type { loadAdminDeals } from "@/lib/admin/load-marketing";
import { marketingHref } from "@/lib/admin/marketing-list-params";

type DealListData = ReturnType<typeof loadAdminDeals>;

export function AdminDealList({ data }: { data: DealListData }) {
  const { items, total, page, pageCount, params } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Deals
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Category, brand, and bundle discounts — {total} deal
            {total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/admin/deals/new"
          className={buttonClassName({ size: "sm" })}
        >
          New deal
        </Link>
      </div>

      <AdminCampaignFilters actionPath="/admin/deals" params={params} />

      {items.length === 0 ? (
        <EmptyState
          title="No deals found"
          description="Try adjusting filters or create a new deal."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Scope</TableHeader>
                <TableHeader>Discount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Schedule</TableHeader>
                <TableHeader className="w-20" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-text">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-caption capitalize">
                    {item.scope}: {item.scopeLabel}
                  </TableCell>
                  <TableCell className="text-caption">{item.discountLabel}</TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-caption text-text-muted">
                    {item.startsAt} → {item.endsAt}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/deals/${item.id}`}
                      className="text-caption font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pageCount > 1 ? (
        <Pagination
          page={page}
          pageCount={pageCount}
          hrefForPage={(p) =>
            marketingHref("/admin/deals", { base: params, page: p })
          }
        />
      ) : null}
    </div>
  );
}
