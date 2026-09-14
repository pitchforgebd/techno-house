/**
 * Steadfast Courier API.
 *
 * Base URL, endpoint paths, and field names are corroborated by Steadfast's
 * own WordPress plugin listing and multiple independent integration guides
 * (checked against live sources), so confidence here is reasonably high —
 * but this has not been run against a real Steadfast account. Verify one
 * real order end-to-end before relying on it live.
 */
import { loadDecryptedSteadfastFromDb } from "@/lib/shipping/courier-settings";
import { courierPost } from "@/lib/shipping/courier-http";

const BASE_URL = "https://portal.packzy.com/api/v1";

export type SendCourierResult =
  | { ok: true; consignmentId: string; trackingCode: string; status: string }
  | { ok: false; reason: string };

function steadfastHeaders(config: {
  apiKey: string;
  secretKey: string;
}): Record<string, string> {
  return {
    "Api-Key": config.apiKey,
    "Secret-Key": config.secretKey,
  };
}

export async function sendOrderToSteadfast(input: {
  invoice: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
  note?: string;
}): Promise<SendCourierResult> {
  const config = await loadDecryptedSteadfastFromDb();
  if (!config) {
    return { ok: false, reason: "Steadfast is not configured or enabled." };
  }

  const posted = await courierPost({
    url: `${BASE_URL}/create_order`,
    contentType: "application/json",
    headers: steadfastHeaders(config),
    body: JSON.stringify({
      invoice: input.invoice,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount,
      note: input.note?.slice(0, 250) ?? "",
    }),
  });
  if (!posted.ok) {
    return { ok: false, reason: posted.reason };
  }

  let parsed: {
    consignment?: { consignment_id?: number | string; tracking_code?: string; status?: string };
    consignment_id?: number | string;
    tracking_code?: string;
    status?: string;
    message?: string;
  };
  try {
    parsed = JSON.parse(posted.text);
  } catch {
    return { ok: false, reason: "Steadfast returned an unreadable response." };
  }

  // Steadfast's create_order response nests the row under "consignment" in
  // some API versions and flat in others — accept either shape.
  const consignment = parsed.consignment ?? parsed;
  const consignmentId = String(consignment.consignment_id ?? "").trim();
  const trackingCode = (consignment.tracking_code ?? "").trim();
  const status = (consignment.status ?? "").trim();

  if (posted.status >= 400 || !consignmentId) {
    return {
      ok: false,
      reason: parsed.message || "Steadfast did not accept this order.",
    };
  }

  return { ok: true, consignmentId, trackingCode, status: status || "in_review" };
}
