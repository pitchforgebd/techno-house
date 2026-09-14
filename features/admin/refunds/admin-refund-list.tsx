"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Frown, Search } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminRefundDetailModal } from "@/features/admin/refunds/admin-refund-detail-modal";
import { AdminRefundRowActions } from "@/features/admin/refunds/admin-refund-row-actions";
import type { AdminRefundListResult } from "@/lib/admin/load-refunds";
import type { AdminRefund, RefundStatus } from "@/lib/admin/orders-mock";
import {
  DISPUTE_TAB_LABELS,
  REFUND_TAB_LABELS,
  adminRefundsHref,
  refundChannelLabel,
  refundStatusLabel,
  type AdminRefundTab,
} from "@/lib/admin/refund-list-params";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

const TABS: AdminRefundTab[] = [
  "all",
  "pending",
  "approved",
  "rejected",
  "wallet",
  "offline",
];

function approvalBadge(status: RefundStatus) {
  const label = refundStatusLabel(status);
  if (status === "rejected") {
    return (
      <span className="inline-flex rounded bg-rose-100 px-2 py-0.5 text-[0.7rem] font-semibold text-rose-600">
        {label}
      </span>
    );
  }
  if (status === "requested") {
    return (
      <span className="inline-flex rounded bg-violet-100 px-2 py-0.5 text-[0.7rem] font-semibold text-violet-700">
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded bg-emerald-100 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-700">
      {label}
    </span>
  );
}

export function AdminRefundList({
  data,
  mode = "refunds",
  canProcess = false,
}: {
  data: AdminRefundListResult;
  mode?: "refunds" | "disputes";
  canProcess?: boolean;
}) {
  const router = useRouter();
  const { items, total, page, pageCount, params } = data;
  const [selected, setSelected] = useState<AdminRefund | null>(null);
  const path =
    mode === "disputes" ? "/admin/refunds/disputes" : "/admin/refunds";
  const tabLabels =
    mode === "disputes" ? DISPUTE_TAB_LABELS : REFUND_TAB_LABELS;
  const startIndex = (page - 1) * data.pageSize;

  function navigate(next: Partial<typeof params>) {
    router.push(
      adminRefundsHref({
        base: params,
        ...next,
        page: 1,
        path,
      }),
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {mode === "disputes"
            ? "All dispute refund requests"
            : "All refund requests"}
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} request{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="border-b border-border p-4 sm:p-5">
          <nav
            aria-label="Refund views"
            className="flex flex-wrap items-center gap-x-5 gap-y-2"
          >
            {TABS.map((tab) => {
              const active = params.tab === tab;
              return (
                <Link
                  key={tab}
                  href={adminRefundsHref({ base: params, tab, page: 1, path })}
                  className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${
                    active
                      ? "border-[#3897f0] text-[#3897f0]"
                      : "border-transparent text-text-muted hover:text-text"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {tabLabels[tab]}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <form
            className="relative"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              navigate({ q: String(form.get("q") ?? "") });
            }}
          >
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400"
              aria-hidden
            />
            <Input
              name="q"
              type="search"
              defaultValue={params.q}
              placeholder="Search request ..."
              className={cn(controlClass, "pl-9")}
            />
          </form>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-16 text-center">
            <p className="text-body font-medium text-neutral-600">
              No data found!
            </p>
            <Frown className="size-10 text-neutral-300" aria-hidden />
            {params.q || params.tab !== "all" ? (
              <Link
                href={path}
                className={buttonClassName({
                  variant: "secondary",
                  size: "sm",
                })}
              >
                Reset filters
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[72rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-12 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    #
                  </TableHeader>
                  <TableHeader className="min-w-[10rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Refund code
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Order
                  </TableHeader>
                  <TableHeader className="min-w-[14rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Product
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Refund amount
                  </TableHeader>
                  <TableHeader className="w-36 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Approval status
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Payment status
                  </TableHeader>
                  <TableHeader className="w-14">
                    <span className="sr-only">Options</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((refund, index) => (
                  <TableRow
                    key={refund.id}
                    className="border-b border-dashed border-neutral-200"
                  >
                    <TableCell className="tabular-nums text-neutral-500">
                      {startIndex + index + 1}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="text-left font-medium text-[#3897f0] hover:underline"
                        onClick={() => setSelected(refund)}
                      >
                        {refund.code}
                      </button>
                      <p className="mt-0.5 text-neutral-700">
                        {refund.customerName}
                      </p>
                    </TableCell>
                    {/* The refund code identifies the REFUND; this is the
                        order it belongs to. Without it, staff working the
                        queue could not tell which order a refund was against
                        without opening each one. */}
                    <TableCell>
                      <Link
                        href={`/admin/orders/${encodeURIComponent(refund.orderNumber)}`}
                        className="font-medium tabular-nums text-[#3897f0] hover:underline"
                      >
                        {refund.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-md border border-neutral-100 bg-neutral-50 text-[0.65rem] font-semibold text-neutral-400">
                          TH
                        </span>
                        <button
                          type="button"
                          className="line-clamp-2 text-left font-medium text-[#3897f0] hover:underline"
                          onClick={() => setSelected(refund)}
                        >
                          {refund.productName}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold tabular-nums text-neutral-800">
                      {formatMoney(refund.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-[0.7rem] text-neutral-500">Admin</p>
                        {approvalBadge(refund.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-neutral-700">
                          {refundChannelLabel(refund.paymentChannel)}
                        </p>
                        {refund.payoutStatus === "paid" ? (
                          <span className="inline-flex rounded bg-emerald-500 px-2 py-0.5 text-[0.7rem] font-semibold text-white">
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex rounded bg-amber-300 px-2 py-0.5 text-[0.7rem] font-semibold text-amber-950">
                            Non-Paid
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <AdminRefundRowActions
                        refund={refund}
                        onViewDetails={setSelected}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {pageCount > 1 ? (
          <div className="border-t border-border px-4 py-4 sm:px-5">
            <Pagination
              page={page}
              pageCount={pageCount}
              hrefForPage={(nextPage) =>
                adminRefundsHref({
                  base: params,
                  page: nextPage,
                  path,
                })
              }
            />
          </div>
        ) : null}
      </div>

      <AdminRefundDetailModal
        refund={selected}
        open={Boolean(selected)}
        canProcess={canProcess}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
