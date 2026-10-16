/**
 * "You've received a discount" email (AD-379) — fires once, right after an
 * admin applies per-product discounts to an already-placed order
 * (lib/orders/item-discounts.ts). A separate email from the order
 * confirmation on purpose: that one fires on placement/first-confirm and
 * talks about the order being received/processed, which would be the wrong
 * framing for a discount applied afterward, sometimes much later.
 *
 * Carries the same freshly-rendered PDF invoice attachment as the
 * confirmation email (now showing the discounted line prices, since
 * `getAdminOrderInvoice` reads straight from the DB after the discount was
 * already saved) — `buildInvoiceAttachment` is shared, not duplicated.
 */
import { sendMail } from "@/lib/mail/send";
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { buildInvoiceAttachment } from "@/lib/orders/order-confirmation-email";
import { publicOrigin } from "@/lib/seo/public-origin";
import { orderTrackingPath } from "@/lib/orders/tracking-link";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";

const ORDERS_FROM_ADDRESS = "orders@technohouse.com.bd";
const ORDERS_FROM_NAME = "Techno House Orders";

export type DiscountSummary = {
  totalDiscount: number;
  originalTotalAmount: number;
};

function discountPercent(summary: DiscountSummary): number {
  if (summary.originalTotalAmount <= 0) {
    return 0;
  }
  return Math.round(
    (summary.totalDiscount / summary.originalTotalAmount) * 100,
  );
}

function buildDiscountText(
  order: CustomerOrderView,
  summary: DiscountSummary,
): string {
  const percent = discountPercent(summary);
  const parts = [
    `Hi ${order.customerName},`,
    "",
    `Good news — a discount has been applied to your order ${order.number}.`,
    "",
    `Total discount: ${percent}% (${formatMoney({ amount: summary.totalDiscount })})`,
    `New order total: ${formatMoney({ amount: order.totalAmount })}`,
    "",
    "The updated invoice, with the discounted price shown next to each product, is attached as a PDF.",
    "",
    `Track your order: ${publicOrigin()}${orderTrackingPath(order.number)}`,
    "",
    "— Techno House",
  ];
  return parts.join("\n");
}

function buildDiscountHtml(
  order: CustomerOrderView,
  summary: DiscountSummary,
  storeName: string,
): string {
  const percent = discountPercent(summary);
  return `<!doctype html>
<html>
<body style="font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 24px; background: #f3f4f6;">
  <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 28px; border: 1px solid #e5e7eb;">
    <p>Hi ${order.customerName},</p>
    <p>Good news — a discount has been applied to your order <strong>${order.number}</strong>.</p>
    <div style="margin: 20px 0; padding: 16px; border-radius: 8px; background: #ecfdf5; border: 1px solid #a7f3d0;">
      <p style="margin: 0; font-size: 13px; color: #065f46;">Total discount</p>
      <p style="margin: 2px 0 0; font-size: 22px; font-weight: 700; color: #047857;">
        ${percent}% &middot; ${formatMoney({ amount: summary.totalDiscount })}
      </p>
    </div>
    <p>New order total: <strong>${formatMoney({ amount: order.totalAmount })}</strong></p>
    <p>The updated invoice, with the discounted price shown next to each product, is attached as a PDF.</p>
    <p>
      <a href="${publicOrigin()}${orderTrackingPath(order.number)}" style="color: #0f766e;">Track your order</a>
    </p>
    <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">— ${storeName}</p>
  </div>
</body>
</html>`;
}

async function sendDiscountMail(
  order: CustomerOrderView,
  summary: DiscountSummary,
): Promise<void> {
  const [attachment, branding] = await Promise.all([
    buildInvoiceAttachment(order.number),
    getStorefrontBranding(),
  ]);

  await sendMail({
    to: order.customerEmail,
    subject: `You've received a discount — ${order.number}`,
    text: buildDiscountText(order, summary),
    html: buildDiscountHtml(order, summary, branding.storeName),
    attachments: attachment ? [attachment] : undefined,
    from: { address: ORDERS_FROM_ADDRESS, name: ORDERS_FROM_NAME },
  });
}

/** Fire-and-forget, same precedent as order confirmation emails — a mail
 * delivery failure must never undo the discount that triggered it. */
export function sendCustomerDiscountInvoiceSafe(
  order: CustomerOrderView,
  summary: DiscountSummary,
): void {
  if (!order.customerEmail.trim()) {
    return;
  }
  void sendDiscountMail(order, summary).catch(() => {
    // Delivery failures must not affect the calling mutation.
  });
}
