import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { AdminOrderListParams } from "@/lib/admin/order-list-params";

export function AdminOrderFilters({
  params,
  actionPath,
}: {
  params: AdminOrderListParams;
  actionPath: "/admin/orders" | "/admin/orders/unpaid";
}) {
  const unpaid = actionPath.endsWith("/unpaid");

  return (
    <form
      method="get"
      action={actionPath}
      className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="min-w-0 flex-1 space-y-1 sm:min-w-[12rem]">
        <span className="text-caption font-medium text-text-muted">Search</span>
        <Input
          name="q"
          type="search"
          defaultValue={params.q}
          placeholder="Order #, customer…"
          className="min-h-10"
        />
      </label>

      {!unpaid ? (
        <label className="space-y-1 sm:w-40">
          <span className="text-caption font-medium text-text-muted">
            Payment
          </span>
          <Select
            name="payment"
            defaultValue={params.payment}
            className="min-h-10"
          >
            <option value="all">All payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </Select>
        </label>
      ) : null}

      <label className="space-y-1 sm:w-44">
        <span className="text-caption font-medium text-text-muted">
          Fulfillment
        </span>
        <Select
          name="fulfillment"
          defaultValue={params.fulfillment}
          className="min-h-10"
        >
          <option value="all">All fulfillment</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </label>

      <div className="flex gap-2">
        <button type="submit" className={buttonClassName({ size: "sm" })}>
          Apply
        </button>
        <Link
          href={actionPath}
          className={buttonClassName({
            variant: "ghost",
            size: "sm",
            className: "border border-border",
          })}
        >
          Reset
        </Link>
      </div>
    </form>
  );
}
