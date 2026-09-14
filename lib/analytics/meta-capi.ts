/**
 * Meta Conversion API — server-side Purchase events (AD-268).
 *
 * Sends a real event to Meta's Graph API when an order is placed. Reuses
 * the Pixel ID already saved on the Meta Pixel admin page (`AnalyticsConfiguration`,
 * provider="META_PIXEL"). The access token is never stored in the database —
 * it comes from the META_CAPI_ACCESS_TOKEN env var. Missing config, a
 * disabled pixel, or a missing token all fail closed (no request is sent).
 */
import { createHash, randomUUID } from "node:crypto";
import { getAdminMetaConfig } from "@/lib/analytics/config";

const GRAPH_API_VERSION = "v21.0";

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function sha256Lower(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export type MetaCapiPurchaseInput = {
  eventId?: string;
  orderNumber: string;
  value: number;
  currency: string;
  contentIds: string[];
  email?: string | null;
  phone?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  eventSourceUrl?: string;
};

export type MetaCapiResult = { ok: true } | { ok: false; reason: string };

/** True only when a pixel is enabled and an access token is present — never reveals the token. */
export async function isMetaCapiConfigured(): Promise<boolean> {
  if (!usesDatabase()) {
    return false;
  }
  const config = await getAdminMetaConfig();
  return config.isEnabled && Boolean(config.publicId) && Boolean(process.env.META_CAPI_ACCESS_TOKEN?.trim());
}

export async function sendMetaCapiPurchase(
  input: MetaCapiPurchaseInput,
): Promise<MetaCapiResult> {
  if (!usesDatabase()) {
    return { ok: false, reason: "Meta CAPI needs the database." };
  }
  const config = await getAdminMetaConfig();
  if (!config.isEnabled || !config.publicId) {
    return { ok: false, reason: "Meta Pixel is not enabled." };
  }
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return { ok: false, reason: "META_CAPI_ACCESS_TOKEN is not set." };
  }

  const userData: Record<string, unknown> = {};
  const email = input.email?.trim();
  if (email) {
    userData.em = [sha256Lower(email)];
  }
  const phoneDigits = input.phone ? digitsOnly(input.phone) : "";
  if (phoneDigits) {
    userData.ph = [sha256Lower(phoneDigits)];
  }
  if (input.clientIpAddress) {
    userData.client_ip_address = input.clientIpAddress;
  }
  if (input.clientUserAgent) {
    userData.client_user_agent = input.clientUserAgent;
  }

  const body = {
    data: [
      {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId?.trim() || randomUUID(),
        action_source: "website",
        event_source_url: input.eventSourceUrl,
        order_id: input.orderNumber,
        user_data: userData,
        custom_data: {
          currency: input.currency,
          value: input.value,
          content_ids: input.contentIds,
          content_type: "product",
        },
      },
    ],
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.publicId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      return {
        ok: false,
        reason: `Meta CAPI request failed (${response.status}): ${text.slice(0, 300)}`,
      };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : "Meta CAPI request failed.",
    };
  }
}

/** Fire-and-forget — CAPI delivery must never fail the calling order/checkout flow. */
export function sendMetaCapiPurchaseSafe(input: MetaCapiPurchaseInput): void {
  void sendMetaCapiPurchase(input).catch(() => {
    // Delivery failures must not affect the calling mutation.
  });
}
