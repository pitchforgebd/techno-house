import { NextResponse } from "next/server";
import { getPaymentGatewayConfig } from "@/lib/payments/config";
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
  // A trusted config value, not request.url — see paymentReturnUrl's doc
  // comment for why (Nginx-proxied request.url quietly resolves to
  // localhost here in production).
  const config = await getPaymentGatewayConfig();
  return NextResponse.redirect(
    paymentReturnUrl(config.publicBaseUrl ?? request.url, order, status),
    303,
  );
}
