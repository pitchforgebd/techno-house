"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  readLastOrderSnapshot,
  type MockOrderSnapshot,
} from "@/lib/cart/checkout";
import { paymentMethodLabel } from "@/lib/cart/payment";
import { resolveShippingRate } from "@/lib/cart/shipping";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { orderStatusLabel, paymentPendingNote } from "@/lib/orders/order-view";

function subscribe() {
  return () => {};
}

function OrderReceipt({ order }: { order: MockOrderSnapshot }) {
  const shipping = resolveShippingRate(
    order.shippingMethodId,
    order.shippingAreaId,
  );
  const placedAt = new Date(order.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-6">
        <section className="overflow-hidden border border-border bg-surface">
          <div className="border-b border-border bg-success/10 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-text">
                  Thank you — order placed
                </h2>
                <p className="mt-1 text-body text-text-muted">
                  Order{" "}
                  <span className="font-mono font-medium text-primary">
                    {order.orderId}
                  </span>{" "}
                  · {placedAt}
                </p>
                <p className="mt-2 text-caption text-text-muted">
                  Local preview receipt · payment not charged.
                </p>
              </div>
              <Badge tone="neutral">Preview</Badge>
            </div>
          </div>
        </section>

        <section
          className="border border-border bg-surface p-5"
          aria-labelledby="confirmation-items-heading"
        >
          <h2
            id="confirmation-items-heading"
            className="text-label font-semibold text-text"
          >
            Items ordered
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {order.lineSummaries.map((line) => (
              <li
                key={`${order.orderId}-${line.slug}`}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/product/${line.slug}`}
                    className="text-label font-medium text-text hover:text-primary"
                  >
                    {line.name}
                  </Link>
                  {line.colorName ? (
                    <p className="mt-0.5 text-caption text-text-muted">
                      Colour: {line.colorName}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-caption text-text-muted">
                    Qty {line.quantity}
                  </p>
                </div>
                <p className="tabular-nums text-label font-semibold text-text">
                  {formatMoney({ amount: line.lineTotal })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="border border-border bg-surface p-5"
          aria-labelledby="confirmation-delivery-heading"
        >
          <h2
            id="confirmation-delivery-heading"
            className="text-label font-semibold text-text"
          >
            Delivery & contact
          </h2>
          <dl className="mt-3 space-y-3 text-body">
            <div>
              <dt className="text-caption text-text-muted">Contact</dt>
              <dd className="text-text">
                {order.fullName} · {order.phone}
              </dd>
              <dd className="text-text-muted">{order.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Address</dt>
              <dd className="text-text">{order.addressLine}</dd>
            </div>
            {order.notes.trim() ? (
              <div>
                <dt className="text-caption text-text-muted">Order notes</dt>
                <dd className="text-text-muted">{order.notes}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-caption text-text-muted">Shipping method</dt>
              <dd className="text-text">
                {shipping.ok
                  ? `${shipping.method.name}${
                      shipping.area ? ` · ${shipping.area.name}` : ""
                    }`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Payment method</dt>
              <dd className="text-text">
                {paymentMethodLabel(order.paymentMethodId)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className="overflow-hidden border border-border bg-surface lg:sticky lg:top-24">
        <div className="border-b border-border bg-text px-5 py-3">
          <h2 className="text-label font-semibold tracking-tight text-primary-foreground">
            Order summary
          </h2>
        </div>
        <div className="space-y-2 px-5 py-4 text-body">
          <p className="text-caption text-text-muted">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·
            display only
          </p>
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatMoney({ amount: order.subtotal })}
            </span>
          </p>
          {order.discountAmount > 0 ? (
            <p className="flex justify-between text-success">
              <span>
                Coupon
                {order.couponCode ? (
                  <span className="ml-1 font-mono text-caption">
                    ({order.couponCode})
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums">
                −{formatMoney({ amount: order.discountAmount })}
              </span>
            </p>
          ) : null}
          <p className="flex justify-between">
            <span>Shipping</span>
            <span className="tabular-nums">
              {order.shippingAmount === 0
                ? "Free"
                : formatMoney({ amount: order.shippingAmount })}
            </span>
          </p>
          <p className="flex justify-between border-t border-border pt-2 text-label font-semibold text-text">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney({ amount: order.total })}
            </span>
          </p>
        </div>
        <div className="space-y-2 border-t border-border bg-surface-muted/50 px-5 py-4 print:hidden">
          <button
            type="button"
            className={buttonClassName({
              variant: "secondary",
              className: "w-full",
            })}
            onClick={() => window.print()}
          >
            Print receipt
          </button>
          <Link
            href="/shop"
            className={buttonClassName({ className: "w-full" })}
          >
            Continue shopping
          </Link>
          <Link
            href="/account"
            className={buttonClassName({
              variant: "ghost",
              className: "w-full border border-border",
            })}
          >
            View account
          </Link>
        </div>
      </aside>
    </div>
  );
}

function ServerOrderReceipt({ order }: { order: CustomerOrderView }) {
  const placedAt = new Date(order.placedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div className="space-y-6">
        <section className="overflow-hidden border border-border bg-surface">
          <div className="border-b border-border bg-success/10 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-text">
                  Thank you — order placed
                </h2>
                <p className="mt-1 text-body text-text-muted">
                  Order{" "}
                  <span className="font-mono font-medium text-primary">
                    {order.number}
                  </span>{" "}
                  · {placedAt}
                </p>
                <p className="mt-2 text-caption text-text-muted">
                  {paymentPendingNote(order.paymentFlow, order.paymentStatus)}
                </p>
              </div>
              <Badge tone="neutral">{orderStatusLabel(order.status)}</Badge>
            </div>
          </div>
        </section>

        <section
          className="border border-border bg-surface p-5"
          aria-labelledby="confirmation-items-heading"
        >
          <h2
            id="confirmation-items-heading"
            className="text-label font-semibold text-text"
          >
            Items ordered
          </h2>
          <ul className="mt-3 divide-y divide-border">
            {order.items.map((line, index) => (
              <li
                key={`${order.number}-${line.sku}-${index}`}
                className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  {line.productSlug ? (
                    <Link
                      href={`/product/${line.productSlug}`}
                      className="text-label font-medium text-text hover:text-primary"
                    >
                      {line.productName}
                    </Link>
                  ) : (
                    <p className="text-label font-medium text-text">
                      {line.productName}
                    </p>
                  )}
                  {line.colorName ? (
                    <p className="mt-0.5 text-caption text-text-muted">
                      Colour: {line.colorName}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-caption text-text-muted">
                    Qty {line.quantity}
                  </p>
                </div>
                <p className="tabular-nums text-label font-semibold text-text">
                  {formatMoney({ amount: line.totalAmount })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="border border-border bg-surface p-5"
          aria-labelledby="confirmation-delivery-heading"
        >
          <h2
            id="confirmation-delivery-heading"
            className="text-label font-semibold text-text"
          >
            Delivery & contact
          </h2>
          <dl className="mt-3 space-y-3 text-body">
            <div>
              <dt className="text-caption text-text-muted">Contact</dt>
              <dd className="text-text">
                {order.customerName} · {order.customerPhone}
              </dd>
              <dd className="text-text-muted">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Address</dt>
              <dd className="text-text">{order.shippingAddress}</dd>
            </div>
            {order.notes ? (
              <div>
                <dt className="text-caption text-text-muted">Order notes</dt>
                <dd className="text-text-muted">{order.notes}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-caption text-text-muted">Shipping method</dt>
              <dd className="text-text">{order.shippingMethodLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Payment method</dt>
              <dd className="text-text">
                {paymentMethodLabel(order.paymentMethodId)}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <aside className="overflow-hidden border border-border bg-surface lg:sticky lg:top-24">
        <div className="border-b border-border bg-text px-5 py-3">
          <h2 className="text-label font-semibold tracking-tight text-primary-foreground">
            Order summary
          </h2>
        </div>
        <div className="space-y-2 px-5 py-4 text-body">
          <p className="text-caption text-text-muted">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
          </p>
          <p className="flex justify-between">
            <span>Subtotal</span>
            <span className="tabular-nums">
              {formatMoney({ amount: order.subtotalAmount })}
            </span>
          </p>
          {order.discountAmount > 0 ? (
            <p className="flex justify-between text-success">
              <span>
                Coupon
                {order.couponCode ? (
                  <span className="ml-1 font-mono text-caption">
                    ({order.couponCode})
                  </span>
                ) : null}
              </span>
              <span className="tabular-nums">
                −{formatMoney({ amount: order.discountAmount })}
              </span>
            </p>
          ) : null}
          <p className="flex justify-between">
            <span>Shipping</span>
            <span className="tabular-nums">
              {order.shippingAmount === 0
                ? "Free"
                : formatMoney({ amount: order.shippingAmount })}
            </span>
          </p>
          {order.serviceChargeAmount > 0 ? (
            <p className="flex justify-between">
              <span>Service charge</span>
              <span className="tabular-nums">
                {formatMoney({ amount: order.serviceChargeAmount })}
              </span>
            </p>
          ) : null}
          {order.taxAmount > 0 ? (
            <p className="flex justify-between">
              <span>VAT</span>
              <span className="tabular-nums">
                {formatMoney({ amount: order.taxAmount })}
              </span>
            </p>
          ) : null}
          <p className="flex justify-between border-t border-border pt-2 text-label font-semibold text-text">
            <span>Total</span>
            <span className="tabular-nums">
              {formatMoney({ amount: order.totalAmount })}
            </span>
          </p>
        </div>
        <div className="space-y-2 border-t border-border bg-surface-muted/50 px-5 py-4 print:hidden">
          <Link
            href={`/account/orders/${encodeURIComponent(order.number)}`}
            className={buttonClassName({ className: "w-full" })}
          >
            View order
          </Link>
          <Link
            href="/shop"
            className={buttonClassName({
              variant: "ghost",
              className: "w-full border border-border",
            })}
          >
            Continue shopping
          </Link>
        </div>
      </aside>
    </div>
  );
}

export function CheckoutConfirmationView({
  serverOrder,
}: {
  serverOrder: CustomerOrderView | null;
}) {
  const mockOrder = useSyncExternalStore(
    subscribe,
    readLastOrderSnapshot,
    () => null,
  );
  const order = serverOrder ?? mockOrder;

  if (!order) {
    return (
      <div className="mx-auto max-w-content px-4 py-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/cart", label: "Cart" },
            { label: "Confirmation" },
          ]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Order confirmation
        </h1>
        <EmptyState
          className="mt-6"
          title="No order found"
          description="Place an order from checkout to see a confirmation receipt."
          action={
            <Link href="/checkout" className={buttonClassName({ size: "sm" })}>
              Go to checkout
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8 md:py-10">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/cart", label: "Cart" },
          { label: "Confirmation" },
        ]}
      />
      <header className="mt-5 border-b border-border pb-5">
        <h1 className="text-2xl font-semibold tracking-tight text-text">
          Order confirmation
        </h1>
      </header>
      <div className="mt-8">
        {serverOrder ? (
          <ServerOrderReceipt order={serverOrder} />
        ) : (
          <OrderReceipt order={order as MockOrderSnapshot} />
        )}
      </div>
    </div>
  );
}
