import { NextResponse } from "next/server";
import {
  parsePaymentBrowserReturn,
  paymentReturnUrl,
} from "@/lib/payments/return";
import { processNagadCallback } from "@/lib/payments/nagad";

/**
 * Nagad browser callback.
 * Nagad redirects here after checkout with payment_ref_id + status query
 * params — best-effort field names, not verified against a live sandbox
 * (see lib/payments/nagad.ts). status is never treated as proof; the
 * server calls Nagad's verify endpoint before marking anything paid.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const order = url.searchParams.get("order") ?? "";
  const nagadStatus = (url.searchParams.get("status") ?? "").toLowerCase();
  const status = parsePaymentBrowserReturn(
    nagadStatus === "success"
      ? "success"
      : nagadStatus === "cancelled"
        ? "cancel"
        : nagadStatus
          ? "fail"
          : null,
  );
  try {
    await processNagadCallback({
      orderNumber: order,
      paymentRefId: url.searchParams.get("payment_ref_id"),
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
