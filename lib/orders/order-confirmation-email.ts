/**
 * Customer-facing order email — two events share this template:
 *  - "placed": fires once, right after checkout (not tied to payment status;
 *    a COD order is confirmed on placement same as a paid one — see
 *    paymentPendingNote in order-view.ts for how payment state itself is
 *    communicated).
 *  - "confirmed": fires once, the moment staff move the order to
 *    Processing (Order.confirmedAt going from unset to set — see the
 *    `!existing.confirmedAt` guard in lib/orders/admin-orders.ts, which
 *    keeps this from re-firing on every later edit while it stays
 *    Processing).
 *
 * Sent from the dedicated orders mailbox rather than whatever address is
 * configured in Admin -> SMTP Settings, so replies land somewhere staff
 * actually read order mail from. sendMail's `from` override is display-only
 * (see its doc comment) — this still goes out over the one SMTP account
 * configured in admin.
 */
import { sendMailSafe } from "@/lib/mail/send";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { publicOrigin } from "@/lib/seo/public-origin";
import { orderTrackingPath } from "@/lib/orders/tracking-link";

const ORDERS_FROM_ADDRESS = "orders@technohouse.com.bd";
const ORDERS_FROM_NAME = "Techno House Orders";

export type OrderNotificationEvent = "placed" | "confirmed";

function buildOrderConfirmationText(
  order: CustomerOrderView,
  event: OrderNotificationEvent,
): string {
  const lines = order.items.map(
    (item) =>
      `  - ${item.productName} x${item.quantity} — ${formatMoney({ amount: item.totalAmount })}`,
  );

  const opening =
    event === "confirmed"
      ? `Your order ${order.number} has been confirmed and is now being processed.`
      : `Thank you for your order. Here is a summary of order ${order.number}.`;

  const parts = [
    `Hi ${order.customerName},`,
    "",
    opening,
    "",
    "Items:",
    ...lines,
    "",
    `Subtotal: ${formatMoney({ amount: order.subtotalAmount })}`,
  ];

  if (order.discountAmount > 0) {
    parts.push(`Discount: -${formatMoney({ amount: order.discountAmount })}`);
  }
  parts.push(
    `Shipping: ${order.shippingAmount === 0 ? "Free" : formatMoney({ amount: order.shippingAmount })}`,
  );
  if (order.serviceChargeAmount > 0) {
    parts.push(`Service charge: ${formatMoney({ amount: order.serviceChargeAmount })}`);
  }
  if (order.taxAmount > 0) {
    parts.push(`VAT: ${formatMoney({ amount: order.taxAmount })}`);
  }
  parts.push(`Total: ${formatMoney({ amount: order.totalAmount })}`);
  parts.push("");
  parts.push(`Delivery address: ${order.shippingAddress}`);
  if (order.shippingMethodLabel) {
    parts.push(`Delivery method: ${order.shippingMethodLabel}`);
  }
  parts.push("");
  parts.push(
    order.paymentFlow === "offline"
      ? "Payment method: Cash on delivery."
      : "You can check your payment status any time from your account.",
  );
  parts.push("");
  parts.push(
    `Track your order: ${publicOrigin()}${orderTrackingPath(order.number)}`,
  );
  parts.push("");
  parts.push("— Techno House");

  return parts.join("\n");
}

/** Fire-and-forget, same as every other post-checkout/order-update side
 * effect here — a mail delivery failure must never undo the order change
 * that triggered it. */
export function sendCustomerOrderConfirmationSafe(
  order: CustomerOrderView,
  event: OrderNotificationEvent = "placed",
): void {
  if (!order.customerEmail.trim()) {
    return;
  }
  const subject =
    event === "confirmed"
      ? `Order confirmed — ${order.number}`
      : `Order received — ${order.number}`;
  sendMailSafe({
    to: order.customerEmail,
    subject,
    text: buildOrderConfirmationText(order, event),
    from: { address: ORDERS_FROM_ADDRESS, name: ORDERS_FROM_NAME },
  });
}
