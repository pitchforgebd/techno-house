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
 * Every send carries the PDF invoice as an attachment, stamped PAID or
 * UNPAID to match the order's actual payment status at send time — a COD
 * order re-sent after later being paid would otherwise still say UNPAID,
 * but each event builds this fresh from the current order/payment row, not
 * from anything cached.
 *
 * Sent from the dedicated orders mailbox rather than whatever address is
 * configured in Admin -> SMTP Settings, so replies land somewhere staff
 * actually read order mail from. sendMail's `from` override is display-only
 * (see its doc comment) — this still goes out over the one SMTP account
 * configured in admin.
 */
import { sendMail } from "@/lib/mail/send";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import type { OrderNotificationEvent } from "@/lib/orders/order-notification-event";
import { publicOrigin } from "@/lib/seo/public-origin";
import { orderTrackingPath } from "@/lib/orders/tracking-link";
import { renderOrderConfirmationHtml } from "@/lib/orders/order-confirmation-html";
import { getAdminOrderInvoice } from "@/lib/orders/admin-invoice";
import {
  generateInvoiceQrDataUrl,
  invoiceQrSourceFromInvoice,
} from "@/lib/orders/invoice-qr";
import { renderInvoiceHtml } from "@/lib/orders/invoice-html";
import { renderInvoicePdf } from "@/lib/orders/invoice-pdf";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";

export type { OrderNotificationEvent } from "@/lib/orders/order-notification-event";

const ORDERS_FROM_ADDRESS = "orders@technohouse.com.bd";
const ORDERS_FROM_NAME = "Techno House Orders";

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
  parts.push("The invoice is attached as a PDF.");
  parts.push("");
  parts.push("— Techno House");

  return parts.join("\n");
}

/** Builds the PDF invoice attachment. Returns null (never throws) so a
 * PDF/rendering problem degrades to a plain email instead of no email. */
async function buildInvoiceAttachment(
  orderNumber: string,
): Promise<{ filename: string; content: Buffer } | null> {
  try {
    const invoice = await getAdminOrderInvoice(orderNumber);
    if (!invoice) {
      return null;
    }
    const qrDataUrl = await generateInvoiceQrDataUrl(
      invoiceQrSourceFromInvoice(invoice),
    );
    const html = renderInvoiceHtml(invoice, qrDataUrl, {
      paid: invoice.paymentStatus === "Paid",
    });
    const pdf = await renderInvoicePdf(html);
    return { filename: `invoice-${invoice.number}.pdf`, content: pdf };
  } catch {
    return null;
  }
}

async function sendOrderConfirmationMail(
  order: CustomerOrderView,
  event: OrderNotificationEvent,
): Promise<void> {
  const [attachment, branding] = await Promise.all([
    buildInvoiceAttachment(order.number),
    getStorefrontBranding(),
  ]);
  const trackUrl = `${publicOrigin()}${orderTrackingPath(order.number)}`;
  const subject =
    event === "confirmed"
      ? `Order confirmed — ${order.number}`
      : `Order received — ${order.number}`;

  await sendMail({
    to: order.customerEmail,
    subject,
    text: buildOrderConfirmationText(order, event),
    html: renderOrderConfirmationHtml(
      order,
      event,
      trackUrl,
      branding.storeName,
      branding.logoSrc ? `${publicOrigin()}${branding.logoSrc}` : null,
    ),
    attachments: attachment ? [attachment] : undefined,
    from: { address: ORDERS_FROM_ADDRESS, name: ORDERS_FROM_NAME },
  });
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
  void sendOrderConfirmationMail(order, event).catch(() => {
    // Delivery failures must not affect the calling mutation.
  });
}
