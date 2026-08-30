"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";
import { useMockOrders } from "@/features/account/use-mock-orders";
import {
  mockOrderStatus,
  mockOrderStatusLabel,
} from "@/lib/account/mock-orders";
import { formatMoney } from "@/lib/format/currency";

export function AccountOrdersView() {
  const { orders } = useMockOrders();

  return (
    <AccountShell title="Orders">
      {orders.length === 0 ? (
        <EmptyState
          title="No mock orders yet"
          description="Place a mock order from checkout. History stays on this device until server orders exist."
          action={
            <Link href="/checkout" className={buttonClassName({ size: "sm" })}>
              Go to checkout
            </Link>
          }
        />
      ) : (
        <div>
          <p className="text-caption text-text-muted">
            Device-local preview only. Status does not come from a warehouse or
            payment gateway.
          </p>
          <ul className="mt-4 divide-y divide-border rounded-md border border-border bg-surface">
            {orders.map((order) => {
              const status = mockOrderStatus();
              const placedAt = new Date(order.createdAt).toLocaleString(
                "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <li
                  key={order.orderId}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-label font-medium text-text">
                      {order.orderId}
                    </p>
                    <p className="mt-0.5 text-caption text-text-muted">
                      {placedAt} · {order.itemCount}{" "}
                      {order.itemCount === 1 ? "item" : "items"} ·{" "}
                      {formatMoney({ amount: order.total })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">{mockOrderStatusLabel(status)}</Badge>
                    <Link
                      href={`/account/orders/${encodeURIComponent(order.orderId)}`}
                      className={buttonClassName({
                        size: "sm",
                        variant: "secondary",
                      })}
                    >
                      Track
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
