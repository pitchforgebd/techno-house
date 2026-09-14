"use client";

import Link from "next/link";
import { buttonClassName } from "@/components/ui/button";
import { AccountShell } from "@/features/account/account-shell";
import { useMockOrders } from "@/features/account/use-mock-orders";
import { useCartStore } from "@/features/cart/use-cart-store";
import { useListsStore } from "@/features/lists/use-lists-store";
import { cartItemCount } from "@/lib/cart/cart";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";

const SHORTCUTS = [
  {
    href: "/account/orders",
    label: "Orders",
    hint: "Track purchases",
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    hint: "Saved delivery details",
  },
  {
    href: "/account/wishlist",
    label: "Wishlist",
    hint: "Saved for later",
  },
  {
    href: "/account/compare",
    label: "Compare",
    hint: "Side-by-side specs",
  },
  {
    href: "/account/tickets",
    label: "Support",
    hint: "Tickets and replies",
  },
  {
    href: "/account/profile",
    label: "Profile",
    hint: "Name and contacts",
  },
] as const;

export function AccountDashboardView({
  persist = false,
  latestOrder = null,
}: {
  persist?: boolean;
  latestOrder?: CustomerOrderView | null;
}) {
  const { state: cart } = useCartStore();
  const { state: lists } = useListsStore();
  const { orders } = useMockOrders();
  const lastMock = orders[0] ?? null;
  const lastOrder = persist
    ? latestOrder
      ? {
          orderId: latestOrder.number,
          itemCount: latestOrder.itemCount,
          total: latestOrder.totalAmount,
        }
      : null
    : lastMock
      ? {
          orderId: lastMock.orderId,
          itemCount: lastMock.itemCount,
          total: lastMock.total,
        }
      : null;
  const cartCount = cartItemCount(cart);

  return (
    <AccountShell title="Overview">
      <div className="space-y-8">
        <section aria-labelledby="account-snapshot-heading">
          <h2
            id="account-snapshot-heading"
            className="text-label font-semibold text-text"
          >
            Snapshot
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            <li className="rounded-md border border-border bg-surface px-3 py-3">
              <p className="text-caption text-text-muted">Cart items</p>
              <p className="mt-1 tabular-nums text-xl font-semibold text-text">
                {cartCount}
              </p>
              <Link
                href="/cart"
                className="mt-2 inline-block text-caption font-medium text-primary underline-offset-2 hover:underline"
              >
                View cart
              </Link>
            </li>
            <li className="rounded-md border border-border bg-surface px-3 py-3">
              <p className="text-caption text-text-muted">Wishlist</p>
              <p className="mt-1 tabular-nums text-xl font-semibold text-text">
                {lists.wishlist.length}
              </p>
              <Link
                href="/account/wishlist"
                className="mt-2 inline-block text-caption font-medium text-primary underline-offset-2 hover:underline"
              >
                Open wishlist
              </Link>
            </li>
            <li className="rounded-md border border-border bg-surface px-3 py-3">
              <p className="text-caption text-text-muted">Compare</p>
              <p className="mt-1 tabular-nums text-xl font-semibold text-text">
                {lists.compare.length}
              </p>
              <Link
                href="/account/compare"
                className="mt-2 inline-block text-caption font-medium text-primary underline-offset-2 hover:underline"
              >
                Open compare
              </Link>
            </li>
          </ul>
        </section>

        <section aria-labelledby="account-order-heading">
          <h2
            id="account-order-heading"
            className="text-label font-semibold text-text"
          >
            Latest order
          </h2>
          {lastOrder ? (
            <div className="mt-3 rounded-md border border-border bg-surface px-4 py-3">
              <p className="font-mono text-label font-medium text-primary">
                {lastOrder.orderId}
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {lastOrder.itemCount}{" "}
                {lastOrder.itemCount === 1 ? "item" : "items"} ·{" "}
                {formatMoney({ amount: lastOrder.total })}
                {persist ? "" : " display total"}
              </p>
              <p className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/account/orders/${encodeURIComponent(lastOrder.orderId)}`}
                  className={buttonClassName({
                    size: "sm",
                    variant: "secondary",
                  })}
                >
                  Track order
                </Link>
                <Link
                  href="/account/orders"
                  className={buttonClassName({
                    size: "sm",
                    variant: "ghost",
                    className: "border border-border",
                  })}
                >
                  All orders
                </Link>
              </p>
            </div>
          ) : (
            <p className="mt-2 text-body text-text-muted">
              {persist
                ? "No orders yet. Place one from checkout to see it here."
                : "No mock order on this device yet. Place one from checkout to see it here."}
            </p>
          )}
        </section>

        <section aria-labelledby="account-shortcuts-heading">
          <h2
            id="account-shortcuts-heading"
            className="text-label font-semibold text-text"
          >
            Shortcuts
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {SHORTCUTS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block rounded-md border border-border bg-surface px-4 py-3 hover:border-primary"
                >
                  <p className="text-label font-medium text-text">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-caption text-text-muted">
                    {item.hint}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AccountShell>
  );
}
