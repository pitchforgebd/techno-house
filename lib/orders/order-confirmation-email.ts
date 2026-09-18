/**
 * Customer-facing order confirmation email — fires once, right after an
 * order is placed (not tied to payment status: a COD order is confirmed on
 * placement same as a paid one; see paymentPendingNote in order-view.ts for
 * how the actual payment state is communicated separately).
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

const ORDERS_FROM_ADDRESS = "orders@technohouse.com.bd";
const ORDERS_FROM_NAME = "Techno House Orders";

function buildOrderConfirmationText(order: CustomerOrderView): string {
  const lines = order.items.map(
    (item) =>
      `  - ${item.productName} x${item.quantity} — ${formatMoney({ amount: item.totalAmount })}`,
  );

  const parts = [
    `Hi ${order.customerName},`,
    "",
    `Thank you for your order. Here is a summary of order ${order.number}.`,
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
  parts.push(`Track your order: https://technohouse.com.bd/account/orders/${encodeURIComponent(order.number)}`);
  parts.push("");
  parts.push("— Techno House");

  return parts.join("\n");
}

/** Fire-and-forget, same as every other post-checkout side effect here — a
 * mail delivery failure must never undo an already-placed order. */
export function sendCustomerOrderConfirmationSafe(order: CustomerOrderView): void {
  if (!order.customerEmail.trim()) {
    return;
  }
  sendMailSafe({
    to: order.customerEmail,
    subject: `Order confirmed — ${order.number}`,
    text: buildOrderConfirmationText(order),
    from: { address: ORDERS_FROM_ADDRESS, name: ORDERS_FROM_NAME },
  });
}
