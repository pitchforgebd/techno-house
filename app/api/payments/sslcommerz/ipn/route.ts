import { NextResponse } from "next/server";
import {
  readCallbackFields,
  webhookResponse,
} from "@/lib/payments/callback-fields";
import { processSslcommerzIpn } from "@/lib/payments/sslcommerz";

/**
 * SSLCommerz IPN (P13-T05).
 * Marks paid only after the validation API confirms the transaction.
 * Browser return URLs must not call this logic.
 */
export async function POST(request: Request) {
  try {
    const fields = await readCallbackFields(request);
    const result = await processSslcommerzIpn(fields);
    const response = webhookResponse(result);
    return new NextResponse(response.body, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse("RETRY", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
