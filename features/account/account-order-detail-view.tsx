"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AccountShell } from "@/features/account/account-shell";
import { useMockOrders } from "@/features/account/use-mock-orders";
import {
  MOCK_TRACK_STEPS,
  isMockOrderId,
  mockOrderStatus,
  mockOrderStatusLabel,
  normalizeOrderIdParam,
} from "@/lib/account/mock-orders";
import { paymentMethodLabel } from "@/lib/cart/payment";
import { resolveShippingRate } from "@/lib/cart/shipping";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format/currency";

export function AccountOrderDetailView({ orderId }: { orderId: string }) {
  const { getById } = useMockOrders();
  const id = normalizeOrderIdParam(orderId);
  const order = isMockOrderId(id) ? getById(id) : null;

  if (!order) {
    return (
      <AccountShell title="Order">
        <EmptyState
          title="Order not found"
          description="This mock order is not stored on this device. History is local only."
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

  const status = mockOrderStatus();
  const shipping = resolveShippingRate(
    order.shippingMethodId,
    order.shippingAreaId,
  );
  const placedAt = new Date(order.createdAt).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const currentIndex = MOCK_TRACK_STEPS.findIndex((step) => step.id === status);

  return (
    <AccountShell title={order.orderId}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{mockOrderStatusLabel(status)}</Badge>
          <p className="text-caption text-text-muted">Placed {placedAt}</p>
        </div>

        <section aria-labelledby="order-track-heading">
          <h2
            id="order-track-heading"
            className="text-label font-semibold text-text"
          >
            Tracking
          </h2>
          <ol className="mt-3 space-y-3">
            {MOCK_TRACK_STEPS.map((step, index) => {
              const done = index <= currentIndex;
              return (
                <li key={step.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full",
                      done ? "bg-primary" : "bg-border",
                    )}
                    aria-hidden="true"
                  />
                  <div>
                    <p
                      className={cn(
                        "text-label font-medium",
                        done ? "text-text" : "text-text-muted",
                      )}
                    >
                      {step.label}
                      {index === currentIndex ? (
                        <span className="ml-2 text-caption font-normal text-text-muted">
                          (current mock state)
                        </span>
                      ) : null}
                    </p>
                    <p className="text-caption text-text-muted">{step.note}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="order-items-heading">
          <h2
            id="order-items-heading"
            className="text-label font-semibold text-text"
          >
            Items
          </h2>
          <ul className="mt-3 divide-y divide-border rounded-md border border-border bg-surface">
            {order.lineSummaries.map((line) => (
              <li
                key={`${order.orderId}-${line.slug}`}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
              >
                <div>
                  <Link
                    href={`/product/${line.slug}`}
                    className="text-label font-medium text-text hover:text-primary"
                  >
                    {line.name}
                  </Link>
                  <p className="text-caption text-text-muted">
                    Qty {line.quantity}
                  </p>
                </div>
                <p className="tabular-nums text-label font-semibold">
                  {formatMoney({ amount: line.lineTotal })}
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
                {order.fullName} · {order.phone}
              </dd>
              <dd className="text-text-muted">{order.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Address</dt>
              <dd>{order.addressLine}</dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Shipping</dt>
              <dd>
                {shipping.ok
                  ? `${shipping.method.name}${
                      shipping.area ? ` · ${shipping.area.name}` : ""
                    }`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-text-muted">Payment</dt>
              <dd>
                {paymentMethodLabel(order.paymentMethodId)}{" "}
                <span className="text-text-muted">(not charged)</span>
              </dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 font-semibold">
              <dt>Display total</dt>
              <dd className="tabular-nums">
                {formatMoney({ amount: order.total })}
              </dd>
            </div>
          </dl>
        </section>

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
