"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Alert } from "@/components/ui/alert";
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
                  Thank you — mock order placed
                </h2>
                <p className="mt-1 text-body text-text-muted">
                  Order{" "}
                  <span className="font-mono font-medium text-primary">
                    {order.orderId}
                  </span>{" "}
                  · {placedAt}
                </p>
              </div>
              <Badge tone="neutral">Mock receipt</Badge>
            </div>
          </div>
          <div className="p-5">
            <Alert tone="warning" title="Not a real purchase">
              <p className="text-caption">
                This receipt exists only on this device. No payment was taken and
                no server order was created.
              </p>
            </Alert>
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
                {paymentMethodLabel(order.paymentMethodId)}{" "}
                <span className="text-text-muted">(not charged)</span>
              </dd>
            </div>
          </dl>
        </section>

        <section
          className="border border-border bg-surface-muted/60 p-5"
          aria-labelledby="confirmation-next-heading"
        >
          <h2
            id="confirmation-next-heading"
            className="text-label font-semibold text-text"
          >
            What happens next (later phases)
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-caption text-text-muted">
            <li>Order confirmation email and SMS when SMTP/OTP are wired.</li>
            <li>Track shipment from your account dashboard.</li>
            <li>Payment status updates only from verified server callbacks.</li>
          </ul>
          <p className="mt-3 text-caption text-text-muted">
            Questions? See{" "}
            <Link
              href="/support"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              support
            </Link>{" "}
            or{" "}
            <Link
              href="/shipping"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              shipping info
            </Link>
            .
          </p>
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
            <span>Display total</span>
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

export function CheckoutConfirmationView() {
  const order = useSyncExternalStore(
    subscribe,
    readLastOrderSnapshot,
    () => null,
  );

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
          title="No mock order found"
          description="Place a mock order from checkout to see a confirmation receipt on this device."
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
        <h1 className="text-3xl font-semibold tracking-tight text-text">
          Order confirmation
        </h1>
        <p className="mt-2 text-body text-text-muted">
          Keep this page for reference. It is not proof of payment.
        </p>
      </header>
      <div className="mt-8">
        <OrderReceipt order={order} />
      </div>
    </div>
  );
}
