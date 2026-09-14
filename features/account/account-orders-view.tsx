"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { orderStatusLabel } from "@/lib/orders/order-view";

export function AccountOrdersView({
  serverOrders,
  detailBase = "/account/orders",
}: {
  serverOrders: CustomerOrderView[];
  /** Path this list lives at, so an order opens inside the same panel. */
  detailBase?: string;
}) {
  return (
    <AccountShell title="Orders">
      {serverOrders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Place an order from checkout to see it here."
          action={
            <Link href="/checkout" className={buttonClassName({ size: "sm" })}>
              Go to checkout
            </Link>
          }
        />
      ) : (
        <div>
          <p className="text-caption text-text-muted">
            Orders from your account.
          </p>
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
            {serverOrders.map((order) => {
              const placedAt = new Date(order.placedAt).toLocaleString(
                "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <li
                  key={order.number}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-label font-medium text-text">
                      {order.number}
                    </p>
                    <p className="mt-0.5 text-caption text-text-muted">
                      {placedAt} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"} ·{" "}
                      {formatMoney({ amount: order.totalAmount })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="neutral">
                      {orderStatusLabel(order.status)}
                    </Badge>
                    <Link
                      href={`${detailBase}/${encodeURIComponent(order.number)}`}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                      })}
                    >
                      View
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </AccountShell>
  );
}
