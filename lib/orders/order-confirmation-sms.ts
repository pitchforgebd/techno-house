/**
 * Customer-facing order confirmation SMS — fires alongside the matching
 * email (order-confirmation-email.ts) for the same two events: "placed"
 * right after checkout, "confirmed" when staff move the order to
 * Processing. Phone is a required checkout field, so every order has one;
 * this goes through the same SMS gateway configured in Admin -> OTP/SMS
 * Gateway (`lib/sms/send.ts`), which is no longer OTP-only.
 *
 * Kept short and in Bangla by request — SMS is billed per 70-character
 * segment once the text contains any non-ASCII character, so this only
 * carries what a shopper actually needs at a glance: order id, what was
 * ordered, the total, and a tracking link. Full line-by-line pricing stays
 * in the email.
 */
import { sendSmsSafe } from "@/lib/sms/send";
import { formatMoney } from "@/lib/format/currency";
import type { OrderNotificationEvent } from "@/lib/orders/order-notification-event";
import type { CustomerOrderView } from "@/lib/orders/order-view";
import { orderTrackingPath } from "@/lib/orders/tracking-link";
import { publicOrigin } from "@/lib/seo/public-origin";

function productSummary(order: CustomerOrderView): string {
  const [first, ...rest] = order.items;
  if (!first) {
    return "";
  }
  return rest.length > 0
    ? `${first.productName} +${rest.length} আরও পণ্য`
    : first.productName;
}

function buildOrderConfirmationSmsText(
  order: CustomerOrderView,
  event: OrderNotificationEvent,
): string {
  const trackUrl = `${publicOrigin()}${orderTrackingPath(order.number)}`;
  const opening =
    event === "confirmed"
      ? `Techno House: আপনার অর্ডার #${order.number} কনফার্ম করা হয়েছে।`
      : `Techno House: আপনার অর্ডার #${order.number} সফলভাবে গৃহীত হয়েছে।`;
  return [
    opening,
    `পণ্য: ${productSummary(order)}`,
    `মূল্য: ${formatMoney({ amount: order.totalAmount })}`,
    `ট্র্যাক করুন: ${trackUrl}`,
    `ধন্যবাদান্তে, Techno House`,
  ].join("\n");
}

/** Fire-and-forget, same as every other post-checkout/order-update side
 * effect here — an SMS delivery failure must never undo the order change
 * that triggered it. */
export function sendCustomerOrderConfirmationSmsSafe(
  order: CustomerOrderView,
  event: OrderNotificationEvent = "placed",
): void {
  const phone = order.customerPhone.trim();
  if (!phone) {
    return;
  }
  sendSmsSafe({
    to: phone,
    message: buildOrderConfirmationSmsText(order, event),
  });
}
