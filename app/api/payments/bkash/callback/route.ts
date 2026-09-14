import { NextResponse } from "next/server";
import {
  parsePaymentBrowserReturn,
  paymentReturnUrl,
} from "@/lib/payments/return";
import { processBkashCallback } from "@/lib/payments/bkash";

/**
 * bKash browser callback (P13-T05).
 * status=success is not proof. The server executes/queries bKash, then
 * redirects. The return page still does not mark a payment paid.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const status = parsePaymentBrowserReturn(url.searchParams.get("status"));
  try {
    await processBkashCallback({
      orderNumber: order,
      paymentID: url.searchParams.get("paymentID"),
      status: url.searchParams.get("status"),
    });
  } catch {
    // Shopper still returns home. Payment stays unpaid until a later verify.
  }
  return NextResponse.redirect(
    paymentReturnUrl(request.url, order, status),
    303,
  );
}
