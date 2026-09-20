/**
 * HTML body for the order confirmation/order-confirmed email
 * (order-confirmation-email.ts). Table-based layout with every style
 * inline — the only layout approach that survives Gmail/Outlook's CSS
 * stripping, since neither reliably keeps a `<style>` block.
 *
 * Brand color is a fixed, professional blue rather than the live Design
 * Studio primary color — pulling that in would mean parsing compiled theme
 * CSS just for one accent color in an email nobody but the customer sees
 * next to the live site.
 */
import { formatMoney } from "@/lib/format/currency";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import type { OrderNotificationEvent } from "@/lib/orders/order-notification-event";

const BRAND_COLOR = "#0b5ed7";
const PAID_COLOR = "#15803d";
const UNPAID_COLOR = "#b45309";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderOrderConfirmationHtml(
  order: CustomerOrderView,
  event: OrderNotificationEvent,
  trackUrl: string,
  storeName: string,
  logoSrc: string | null,
): string {
  const paid = order.paymentStatus === "paid";
  const bannerTitle =
    event === "confirmed"
      ? "Your order has been confirmed"
      : "Thanks for your order";
  const paymentBadge = paid
    ? { label: "Payment received", color: PAID_COLOR }
    : {
        label:
          order.paymentFlow === "offline" ? "Cash on delivery" : "Payment pending",
        color: UNPAID_COLOR,
      };

  const itemRows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;">
          ${escapeHtml(item.productName)}
          <div style="font-size:12px;color:#6b7280;">x${item.quantity}</div>
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;white-space:nowrap;">
          ${formatMoney({ amount: item.totalAmount })}
        </td>
      </tr>`,
    )
    .join("");

  const totalRows = [
    ["Subtotal", order.subtotalAmount],
    ...(order.discountAmount > 0 ? [["Discount", -order.discountAmount]] : []),
    ...(order.adminDiscountAmount > 0
      ? [["Confirmation discount", -order.adminDiscountAmount]]
      : []),
    [
      "Shipping",
      order.shippingAmount === 0 ? null : order.shippingAmount,
    ],
    ...(order.serviceChargeAmount > 0
      ? [["Service charge", order.serviceChargeAmount]]
      : []),
    ...(order.taxAmount > 0 ? [["VAT", order.taxAmount]] : []),
  ] as [string, number | null][];

  const totalRowsHtml = totalRows
    .map(
      ([label, amount]) => `
      <tr>
        <td style="padding:3px 0;font-size:13px;color:#6b7280;">${label}</td>
        <td style="padding:3px 0;font-size:13px;color:#6b7280;text-align:right;">
          ${amount === null ? "Free" : formatMoney({ amount })}
        </td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;text-align:center;">
              ${
                logoSrc
                  ? `<img src="${escapeHtml(logoSrc)}" alt="${escapeHtml(storeName)}" style="height:36px;object-fit:contain;" />`
                  : `<span style="color:#ffffff;font-size:22px;font-weight:bold;">${escapeHtml(storeName)}</span>`
              }
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;">
              <h1 style="margin:0 0 4px;font-size:20px;color:#111827;">${bannerTitle}</h1>
              <p style="margin:0;font-size:14px;color:#6b7280;">
                Hi ${escapeHtml(order.customerName)}, here is a summary of order
                <strong>${escapeHtml(order.number)}</strong>.
              </p>
              <span style="display:inline-block;margin-top:14px;padding:6px 14px;border-radius:999px;background:${paymentBadge.color}1a;color:${paymentBadge.color};font-size:12px;font-weight:bold;">
                ${escapeHtml(paymentBadge.label)}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${itemRows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${totalRowsHtml}
                <tr>
                  <td style="padding:10px 0 0;font-size:15px;font-weight:bold;color:#111827;border-top:1px solid #e5e7eb;">Total</td>
                  <td style="padding:10px 0 0;font-size:15px;font-weight:bold;color:#111827;text-align:right;border-top:1px solid #e5e7eb;">
                    ${formatMoney({ amount: order.totalAmount })}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;text-align:center;">
              <a href="${escapeHtml(trackUrl)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:6px;">
                Track your order
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Delivery address: ${escapeHtml(order.shippingAddress)}
              </p>
              ${order.shippingMethodLabel ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">Delivery method: ${escapeHtml(order.shippingMethodLabel)}</p>` : ""}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">— ${escapeHtml(storeName)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
