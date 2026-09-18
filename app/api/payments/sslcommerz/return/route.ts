import { NextResponse } from "next/server";
import { parsePaymentBrowserReturn, paymentReturnUrl } from "@/lib/payments/return";

/**
 * SSLCommerz browser return (success_url/fail_url/cancel_url).
 *
 * SSLCommerz's hosted page returns the browser here via a cross-site POST,
 * not a GET. The customer session cookie is SameSite=Lax (session-cookie.ts),
 * so it is correctly withheld on that cross-site POST — the shopper looks
 * "signed out" on whatever page renders directly at that URL, exactly the
 * kind of gap bKash's callback (app/api/payments/bkash/callback/route.ts)
 * already avoids with this same accept-then-redirect shape. Bouncing through
 * one same-origin 303 redirect turns the next hop into an ordinary top-level
 * GET, which the Lax cookie is sent on.
 *
 * No payment verification happens here — that is the IPN endpoint's job
 * (processSslcommerzIpn), same as every other browser return in this app.
 */
function handle(request: Request): NextResponse {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const status = parsePaymentBrowserReturn(url.searchParams.get("status"));
  return NextResponse.redirect(paymentReturnUrl(request.url, order, status), 303);
}

export async function GET(request: Request): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: Request): Promise<NextResponse> {
  return handle(request);
}
