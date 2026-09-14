import { NextResponse } from "next/server";
import {
  parsePaymentBrowserReturn,
  paymentReturnUrl,
} from "@/lib/payments/return";

/**
 * SSLCommerz browser return (P13-T04).
 * Accepts GET or POST and redirects to the storefront return page.
 * Query/body values are never treated as a paid confirmation.
 */
function redirectHome(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const status = parsePaymentBrowserReturn(url.searchParams.get("status"));
  return NextResponse.redirect(
    paymentReturnUrl(request.url, order, status),
    303,
  );
}

export async function GET(request: Request) {
  return redirectHome(request);
}

export async function POST(request: Request) {
  return redirectHome(request);
}
