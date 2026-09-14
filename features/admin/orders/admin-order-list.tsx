"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import {
  bulkSetAdminOrdersFulfillmentStatusAction,
  bulkSetAdminOrdersPaymentStatusAction,
} from "@/features/admin/orders/order-actions";
import { summarizeBulkResult } from "@/lib/admin/bulk-actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminOrderQuickModal } from "@/features/admin/orders/admin-order-quick-modal";
import { AdminOrderRowActions } from "@/features/admin/orders/admin-order-row-actions";
import {
  type AdminOrderListResult,
} from "@/lib/admin/load-orders";
import { adminOrdersHref } from "@/lib/admin/order-list-params";
import type {
  AdminOrder,
  OrderFulfillmentStatus,
  OrderPaymentStatus,
} from "@/lib/admin/orders-mock";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

const controlClass =
  "h-9 w-full appearance-none rounded-md border border-neutral-200 bg-white px-3 text-sm text-text shadow-sm placeholder:text-neutral-400 focus:border-[#3897f0] focus:outline-none focus:ring-2 focus:ring-[#3897f0]/15";

function paymentBadge(status: OrderPaymentStatus) {
  if (status === "paid") {
    return (
      <span className="inline-flex rounded bg-emerald-500 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
        Paid
      </span>
    );
  }
  if (status === "unpaid") {
    return (
      <span className="inline-flex rounded bg-rose-500 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
        Un-Paid
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex rounded bg-red-600 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex rounded bg-violet-500 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white">
      Refunded
    </span>
  );
}

function deliveryLabel(status: OrderFulfillmentStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}

function deliveryClass(status: OrderFulfillmentStatus) {
  if (status === "delivered") {
    return "font-medium text-emerald-600";
  }
  if (status === "cancelled") {
    return "font-medium text-red-500";
  }
  return "font-medium text-neutral-800";
}

export function AdminOrderList({
  data,
  title,
  actionPath,
  couriers = { pathao: false, steadfast: false },
}: {
  data: AdminOrderListResult;
  title: string;
  actionPath: "/admin/orders" | "/admin/orders/unpaid";
  couriers?: { pathao: boolean; steadfast: boolean };
}) {
  const router = useRouter();
  const { items, total, page, pageCount, params } = data;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quickOrder, setQuickOrder] = useState<AdminOrder | null>(null);
  const [bulkPending, startBulkTransition] = useTransition();
  const unpaid = actionPath.endsWith("/unpaid");

  function runBulk(value: string) {
    if (selected.size === 0) {
      notifyError("Select at least one order first.");
      return;
    }
    const ids = Array.from(selected);
    startBulkTransition(async () => {
      const result =
        value === "mark-paid"
          ? await bulkSetAdminOrdersPaymentStatusAction(ids, "paid")
          : await bulkSetAdminOrdersFulfillmentStatusAction(ids, "shipped");
      const verb = value === "mark-paid" ? "marked paid" : "marked shipped";
      const summary = summarizeBulkResult(result, verb);
      if (summary.tone === "success") {
        notifySuccess(summary.message);
      } else {
        notifyError(summary.message);
      }
      setSelected(new Set());
      router.refresh();
    });
  }

  const allSelected = items.length > 0 && selected.size === items.length;

  function navigate(next: Partial<typeof params>) {
    router.push(
      adminOrdersHref({
        base: params,
        ...next,
        page: 1,
        path: actionPath,
      }),
    );
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((item) => item.id)));
  }

  function toggleSelect(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          {title}
        </h1>
        <p className="mt-1 text-body text-text-muted">
          {total} order{total === 1 ? "" : "s"}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:p-5">
          <nav
            aria-label="Order views"
            className="flex flex-wrap items-center gap-x-6 gap-y-2"
          >
            <Link
              href="/admin/orders"
              className={`-mb-px border-b-2 pb-3 text-body font-medium transition-colors ${
                !unpaid
                  ? "border-[#3897f0] text-[#3897f0]"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
              aria-current={!unpaid ? "page" : undefined}
            >
              All
            </Link>
            <Link
              href="/admin/orders/unpaid"
              className={`-mb-px border-b-2 pb-3 text-body font-medium transition-colors ${
                unpaid
                  ? "border-[#3897f0] text-[#3897f0]"
                  : "border-transparent text-text-muted hover:text-text"
              }`}
              aria-current={unpaid ? "page" : undefined}
            >
              Unpaid
            </Link>
          </nav>
        </div>

        <div className="border-b border-neutral-100 bg-neutral-50/70 px-4 py-3 sm:px-5">
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] xl:items-center">
            <form
              className="relative min-w-0"
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
                placeholder="Search orders..."
                className={cn(controlClass, "pl-9")}
              />
            </form>

            <Select
              aria-label="Bulk action"
              defaultValue=""
              disabled={bulkPending}
              className={cn(controlClass, "xl:w-[10rem]")}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  return;
                }
                event.target.value = "";
                runBulk(value);
              }}
            >
              <option value="">
                {bulkPending
                  ? "Working…"
                  : selected.size > 0
                    ? `Bulk action (${selected.size} selected)`
                    : "Bulk action"}
              </option>
              <option value="mark-paid">Mark paid</option>
              <option value="mark-shipped">Mark shipped</option>
            </Select>

            <Select
              aria-label="Filter by delivery status"
              defaultValue={params.fulfillment}
              className={cn(controlClass, "xl:w-[13rem]")}
              onChange={(event) => {
                navigate({
                  fulfillment: event.target
                    .value as typeof params.fulfillment,
                });
              }}
            >
              <option value="all">Filter by delivery status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </Select>

            {!unpaid ? (
              <Select
                aria-label="Filter by payment status"
                defaultValue={params.payment}
                className={cn(controlClass, "xl:w-[13rem]")}
                onChange={(event) => {
                  navigate({
                    payment: event.target.value as typeof params.payment,
                  });
                }}
              >
                <option value="all">Filter by payment status</option>
                <option value="paid">Paid</option>
                <option value="unpaid">Unpaid</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </Select>
            ) : (
              <div className="hidden xl:block" />
            )}

            <Input
              type="date"
              aria-label="Filter by date"
              defaultValue={params.date}
              className={cn(controlClass, "xl:w-[12rem]")}
              onChange={(event) => {
                navigate({ date: event.target.value });
              }}
            />
          </div>
        </div>

        {items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No orders match"
              description="Try another tab, filter, or search."
              action={
                <Link
                  href={actionPath}
                  className={buttonClassName({
                    variant: "secondary",
                    size: "sm",
                  })}
                >
                  Reset filters
                </Link>
              }
            />
          </div>
        ) : (
          <div className="th-scroll-hide overflow-x-auto">
            <Table className="min-w-[68rem] text-caption">
              <TableHead>
                <TableRow className="border-b border-border bg-surface-muted/60 hover:bg-surface-muted/60">
                  <TableHeader className="w-12">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all orders"
                      className="size-4 accent-[#3897f0]"
                    />
                  </TableHeader>
                  <TableHeader className="min-w-[9rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Order code
                  </TableHeader>
                  <TableHeader className="w-20 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Products
                  </TableHeader>
                  <TableHeader className="min-w-[9rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Customer
                  </TableHeader>
                  <TableHeader className="min-w-[7rem] text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Amount
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Delivery status
                  </TableHeader>
                  <TableHeader className="w-32 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Payment method
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Payment status
                  </TableHeader>
                  <TableHeader className="w-28 text-[0.65rem] font-semibold uppercase tracking-wide text-text-muted">
                    Refund
                  </TableHeader>
                  <TableHeader className="w-14">
                    <span className="sr-only">Options</span>
                  </TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((order) => {
                  const productCount = order.lines.reduce(
                    (sum, line) => sum + line.quantity,
                    0,
                  );
                  return (
                    <TableRow
                      key={order.id}
                      className="border-b border-dashed border-neutral-200"
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selected.has(order.id)}
                          onChange={() => toggleSelect(order.id)}
                          aria-label={`Select ${order.number}`}
                          className="size-4 accent-[#3897f0]"
                        />
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <Link
                            href={`/admin/orders/${encodeURIComponent(order.number)}`}
                            className="font-medium text-[#3897f0] hover:underline"
                          >
                            {order.number}
                          </Link>
                          {order.isNew ? (
                            <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-violet-700">
                              new
                            </span>
                          ) : null}
                        </span>
                      </TableCell>
                      <TableCell className="tabular-nums text-neutral-700">
                        {productCount}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {order.customerName}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-2 font-semibold tabular-nums text-neutral-900">
                          <span
                            className="inline-block h-5 w-0.5 rounded-full bg-[#3897f0]"
                            aria-hidden
                          />
                          {formatMoney(order.total)}
                        </span>
                      </TableCell>
                      <TableCell
                        className={deliveryClass(order.fulfillmentStatus)}
                      >
                        {deliveryLabel(order.fulfillmentStatus)}
                      </TableCell>
                      <TableCell className="text-neutral-700">
                        {order.paymentMethod}
                      </TableCell>
                      <TableCell>
                        {paymentBadge(order.paymentStatus)}
                      </TableCell>
                      <TableCell className="text-neutral-600">
                        {order.refundLabel ?? "No Refund"}
                      </TableCell>
                      <TableCell>
                        <AdminOrderRowActions
                          order={order}
                          onQuickManage={setQuickOrder}
                          couriers={couriers}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
                adminOrdersHref({
                  base: params,
                  page: nextPage,
                  path: actionPath,
                })
              }
            />
          </div>
        ) : null}
      </div>

      <AdminOrderQuickModal
        order={quickOrder}
        open={Boolean(quickOrder)}
        onClose={() => setQuickOrder(null)}
      />
    </div>
  );
}
