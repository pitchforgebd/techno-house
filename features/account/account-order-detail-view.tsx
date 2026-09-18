"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountRefundRequest } from "@/features/account/account-refund-request";
import { AccountShell } from "@/features/account/account-shell";
import { paymentMethodLabel } from "@/lib/cart/payment";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { orderStatusLabel, paymentPendingNote } from "@/lib/orders/order-view";
import type {
  CustomerRefundReasonView,
  CustomerRefundView,
} from "@/lib/refunds/workflow";

export function AccountOrderDetailView({
  serverOrder,
  refunds = [],
  refundReasons = [],
  remainingRefundable = 0,
}: {
  orderId: string;
  serverOrder?: CustomerOrderView | null;
  refunds?: CustomerRefundView[];
  refundReasons?: CustomerRefundReasonView[];
  remainingRefundable?: number;
}) {
  if (!serverOrder) {
    return (
      <AccountShell title="Order">
        <EmptyState
          title="Order not found"
          description="This order is not on your account."
          action={
            <Link
              href="/account/orders"
              className={buttonClassName({ size: "sm" })}
            >
              Back to orders
            </Link>
          }
        />
      </AccountShell>
    );
  }

  const order = serverOrder;
  const placedAt = new Date(order.placedAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <AccountShell title={order.number}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{orderStatusLabel(order.status)}</Badge>
          <p className="text-caption text-text-muted">Placed {placedAt}</p>
        </div>

        <section aria-labelledby="order-items-heading">
          <h2
            id="order-items-heading"
            className="text-label font-semibold text-text"
          >
            Items
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
            {order.items.map((line, index) => (
              <li
                key={`${order.number}-${line.sku}-${index}`}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
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
                    <p className="mt-0.5 flex items-center gap-1.5 text-caption text-text-muted">
                      {line.colorHex ? (
                        <span
                          aria-hidden
                          className="inline-block size-2.5 rounded-sm border border-black/10"
                          style={{ backgroundColor: line.colorHex }}
                        />
                      ) : null}
                      Colour: {line.colorName}
                    </p>
                  ) : null}
                  <p className="text-caption text-text-muted">
                    Qty {line.quantity}
                  </p>
                </div>
                <p className="tabular-nums text-label font-semibold">
                  {formatMoney({ amount: line.totalAmount })}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section
          className="rounded-md border border-border bg-surface p-4"
          aria-labelledby="order-delivery-heading"
        >
          <h2
            id="order-delivery-heading"
            className="text-label font-semibold text-text"
          >
            Delivery & payment
          </h2>
          <dl className="mt-3 space-y-2 text-body">
            <div>
              <dt className="text-caption text-text-muted">Contact</dt>
              <dd>
                {order.customerName} · {order.customerPhone}
              </dd>
              <dd className="text-text-muted">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Address</dt>
              <dd>{order.shippingAddress}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Shipping</dt>
              <dd>{order.shippingMethodLabel ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Payment</dt>
              <dd>
                {paymentMethodLabel(order.paymentMethodId)}{" "}
                <span className="text-text-muted">
                  ({paymentPendingNote(order.paymentFlow, order.paymentStatus)})
                </span>
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">
                {formatMoney({ amount: order.totalAmount })}
              </dd>
            </div>
          </dl>
        </section>

        {order.paymentStatus === "paid" ||
        order.paymentStatus === "partially_refunded" ||
        refunds.length > 0 ? (
          <AccountRefundRequest
            orderNumber={order.number}
            remainingAmount={remainingRefundable}
            reasons={refundReasons}
            refunds={refunds}
          />
        ) : null}

        <p>
          <Link
            href="/account/orders"
            className={buttonClassName({
              size: "sm",
              variant: "ghost",
              className: "border border-border",
            })}
          >
            Back to orders
          </Link>
        </p>
      </div>
    </AccountShell>
  );
}
