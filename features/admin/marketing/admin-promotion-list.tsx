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
import type { loadAdminPromotions } from "@/lib/admin/load-marketing";
import { marketingHref } from "@/lib/admin/marketing-list-params";

type PromotionListData = Awaited<ReturnType<typeof loadAdminPromotions>>;

export function AdminPromotionList({ data }: { data: PromotionListData }) {
  const { items, total, page, pageCount, params } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Promotions
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Homepage ribbons, category banners, and sitewide messaging — {total}{" "}
            campaign{total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/admin/promotions/new"
          className={buttonClassName({ size: "sm" })}
        >
          New promotion
        </Link>
      </div>

      <AdminCampaignFilters
        actionPath="/admin/promotions/campaigns"
        params={params}
      />

      {items.length === 0 ? (
        <EmptyState
          title="No promotions found"
          description="Try adjusting filters or create a new promotion."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Name</TableHeader>
                <TableHeader>Channel</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Schedule</TableHeader>
                <TableHeader className="text-right">Priority</TableHeader>
                <TableHeader className="w-20" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-text">{item.name}</p>
                      <p className="text-caption text-text-muted">
                        {item.summary}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="capitalize text-caption">
                    {item.channel}
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-caption text-text-muted">
                    {item.startsAt} → {item.endsAt}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {item.priority}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/promotions/${item.id}`}
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
            marketingHref("/admin/promotions/campaigns", {
              base: params,
              page: p,
            })
          }
        />
      ) : null}
    </div>
  );
}
