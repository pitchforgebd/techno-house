import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
import { CouponStatusBadge } from "@/features/admin/marketing/admin-marketing-badges";
import type { loadAdminCoupons } from "@/lib/admin/load-marketing";
import { couponsHref } from "@/lib/admin/marketing-list-params";
import { formatMoney } from "@/lib/format/currency";

type CouponListData = Awaited<ReturnType<typeof loadAdminCoupons>>;

const COUPON_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "scheduled", label: "Scheduled" },
  { value: "disabled", label: "Disabled" },
  { value: "expired", label: "Expired" },
] as const;

export function AdminCouponList({ data }: { data: CouponListData }) {
  const { items, total, page, pageCount, params } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text">
            Coupons
          </h1>
          <p className="mt-1 text-body text-text-muted">
            Promo codes for checkout — {total} coupon{total === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className={buttonClassName({ size: "sm" })}
        >
          New coupon
        </Link>
      </div>

      <form
        method="get"
        action="/admin/coupons"
        className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <label className="min-w-0 flex-1 space-y-1 sm:min-w-[12rem]">
          <span className="text-caption font-medium text-text-muted">
            Search
          </span>
          <Input
            name="q"
            type="search"
            defaultValue={params.q}
            placeholder="Code or label…"
            className="min-h-10"
          />
        </label>
        <label className="space-y-1 sm:w-40">
          <span className="text-caption font-medium text-text-muted">
            Status
          </span>
          <Select name="status" defaultValue={params.status}>
            {COUPON_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <button
          type="submit"
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-caption font-medium text-primary-foreground hover:bg-primary/90"
        >
          Apply
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          title="No coupons found"
          description="Try adjusting filters or create a new coupon."
        />
      ) : (
        <div className="overflow-x-auto rounded-md border border-border bg-surface">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Discount</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Usage</TableHeader>
                <TableHeader>Min spend</TableHeader>
                <TableHeader>Valid</TableHeader>
                <TableHeader className="w-20" />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className="font-mono font-medium text-text">
                      {item.code}
                    </p>
                    <p className="text-caption text-text-muted">{item.label}</p>
                  </TableCell>
                  <TableCell className="text-caption">
                    {item.kind === "percent"
                      ? `${item.value}%`
                      : formatMoney({ amount: item.value })}
                  </TableCell>
                  <TableCell>
                    <CouponStatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="tabular-nums text-caption">
                    {item.usageCount}
                    {item.usageLimit != null ? ` / ${item.usageLimit}` : ""}
                  </TableCell>
                  <TableCell className="text-caption">
                    {item.minSpend ? formatMoney(item.minSpend) : "—"}
                  </TableCell>
                  <TableCell className="text-caption text-text-muted">
                    {item.startsAt} → {item.endsAt}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/coupons/${item.id}`}
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
          hrefForPage={(p) => couponsHref({ base: params, page: p })}
        />
      ) : null}
    </div>
  );
}
