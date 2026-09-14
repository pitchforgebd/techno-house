/**
 * Browser return from a hosted gateway (P13-T04).
 * Query status is display-only. It is never proof of payment.
 */
export const PAYMENT_RETURN_PATH = "/checkout/payment/return";

export type PaymentBrowserReturn = "success" | "fail" | "cancel";

export function parsePaymentBrowserReturn(
  value: string | null | undefined,
): PaymentBrowserReturn | null {
  if (value === "success" || value === "fail" || value === "cancel") {
    return value;
  }
  if (value === "failure") {
    return "fail";
  }
  return null;
}

export function paymentReturnUrl(
  requestUrl: string,
  orderNumber: string,
  status: PaymentBrowserReturn | null,
): URL {
  const dest = new URL(PAYMENT_RETURN_PATH, requestUrl);
  if (orderNumber) {
    dest.searchParams.set("order", orderNumber);
  }
  if (status) {
    dest.searchParams.set("status", status);
  }
  return dest;
}
