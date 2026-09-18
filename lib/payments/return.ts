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

/**
 * @param baseUrl A trusted absolute origin — pass the app's own configured
 *   publicBaseUrl (getPaymentGatewayConfig()), not the incoming request's
 *   own `request.url`. Behind this app's Nginx setup, a Route Handler's
 *   `request.url` does not reliably carry the public Host — it can resolve
 *   to the app's own bind address, which quietly rewrites this redirect to
 *   http://localhost:3000/... in production (found via a live SSLCommerz
 *   sandbox test). request.url is an acceptable fallback ONLY when no
 *   publicBaseUrl is configured at all — see the callers.
 */
export function paymentReturnUrl(
  baseUrl: string,
  orderNumber: string,
  status: PaymentBrowserReturn | null,
): URL {
  const dest = new URL(PAYMENT_RETURN_PATH, baseUrl);
  if (orderNumber) {
    dest.searchParams.set("order", orderNumber);
  }
  if (status) {
    dest.searchParams.set("status", status);
  }
  return dest;
}
