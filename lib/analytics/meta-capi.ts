/**
 * Meta Conversions API (AD-268, reworked in AD-389).
 *
 * Configuration:
 *   - Pixel ID: `META_PIXEL_ID` env, else the ID saved on Admin → Meta Pixel.
 *     The admin "enabled" switch is deliberately NOT consulted — with GTM on,
 *     the pixel runs from GTM and that switch is off.
 *   - Access token: `META_CAPI_ACCESS_TOKEN` env only. Never stored in the
 *     database, never sent to the browser, never logged.
 *   - `META_TEST_EVENT_CODE` env adds `test_event_code` (Events Manager → Test).
 * No token or no pixel ID → nothing is sent and nothing errors.
 *
 * Purchase is sent from the server, from the order row, with
 * `event_id = order number` — the same id the browser's Purchase pushes to
 * the dataLayer — so Meta deduplicates the two. COD: right after the order is
 * created. Online payment: only when `confirmGatewayPayment()` moves it to
 * PAID. Other events arrive through the `/api/tracking` relay.
 *
 * Every send has a 5 s timeout and its outcome is logged to the server log
 * (`[meta-capi]` lines). A failure never reaches the caller.
 */
import { createHash } from "node:crypto";
import { after } from "next/server";
import { getAdminMetaConfig } from "@/lib/analytics/config";
import { normalizePixelId } from "@/lib/analytics/ids";
import { getPrisma } from "@/lib/db/prisma";
import { publicOrigin } from "@/lib/seo/public-origin";
import { TRACK_CURRENCY, toMeta, type TrackItem } from "@/lib/tracking/events";
import {
  normalizeBdPhone,
  normalizeEmailForMatch,
  normalizeFirstName,
  sanitizeFbCookie,
} from "@/lib/tracking/match-keys";

const GRAPH_API_VERSION = "v21.0";
const REQUEST_TIMEOUT_MS = 5000;
const DB_PIXEL_CACHE_MS = 60_000;

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export type MetaCapiConfig = {
  pixelId: string;
  accessToken: string;
  testEventCode: string | null;
};

let dbPixelCache: { value: string; at: number } | null = null;

async function pixelIdFromDatabase(): Promise<string> {
  if (!usesDatabase()) {
    return "";
  }
  if (dbPixelCache && Date.now() - dbPixelCache.at < DB_PIXEL_CACHE_MS) {
    return dbPixelCache.value;
  }
  const config = await getAdminMetaConfig();
  const value = normalizePixelId(config.publicId) || "";
  dbPixelCache = { value, at: Date.now() };
  return value;
}

export async function resolveMetaCapiConfig(): Promise<MetaCapiConfig | null> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN?.trim();
  if (!accessToken) {
    return null;
  }
  const fromEnv = normalizePixelId(process.env.META_PIXEL_ID ?? "");
  let pixelId = fromEnv || "";
  if (!pixelId) {
    try {
      pixelId = await pixelIdFromDatabase();
    } catch {
      pixelId = "";
    }
  }
  if (!pixelId) {
    return null;
  }
  return {
    pixelId,
    accessToken,
    testEventCode: process.env.META_TEST_EVENT_CODE?.trim() || null,
  };
}

/** True when a token and a pixel ID are both available — never reveals the token. */
export async function isMetaCapiConfigured(): Promise<boolean> {
  return (await resolveMetaCapiConfig()) !== null;
}

// ---------------------------------------------------------------------------
// Generic event sender
// ---------------------------------------------------------------------------

export type MetaUserDataInput = {
  email?: string | null;
  phone?: string | null;
  fullName?: string | null;
  /** ISO country; defaults to "bd" when any personal key is present. */
  country?: string | null;
  clientIpAddress?: string | null;
  clientUserAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
};

export type MetaEventInput = {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string | null;
  /** Unix seconds; defaults to now. */
  eventTime?: number;
  userData: MetaUserDataInput;
  customData?: Record<string, unknown> | null;
};

export type MetaCapiResult =
  { ok: true; eventsReceived: number | null } | { ok: false; reason: string };

/**
 * Meta `user_data`: personal keys SHA-256-hashed after normalisation
 * (phone as 8801XXXXXXXXX); IP, user agent, fbp and fbc sent as-is.
 */
export function buildMetaUserData(
  input: MetaUserDataInput,
): Record<string, unknown> {
  const userData: Record<string, unknown> = {};
  const email = normalizeEmailForMatch(input.email);
  if (email) {
    userData.em = [sha256(email)];
  }
  const phone = normalizeBdPhone(input.phone);
  if (phone) {
    userData.ph = [sha256(phone)];
  }
  const firstName = normalizeFirstName(input.fullName);
  if (firstName) {
    userData.fn = [sha256(firstName)];
  }
  if (email || phone || firstName) {
    const country = (input.country ?? "bd").trim().toLowerCase();
    if (/^[a-z]{2}$/.test(country)) {
      userData.country = [sha256(country)];
    }
  }
  if (input.clientIpAddress) {
    userData.client_ip_address = input.clientIpAddress;
  }
  if (input.clientUserAgent) {
    userData.client_user_agent = input.clientUserAgent.slice(0, 512);
  }
  const fbp = sanitizeFbCookie(input.fbp);
  if (fbp) {
    userData.fbp = fbp;
  }
  const fbc = sanitizeFbCookie(input.fbc);
  if (fbc) {
    userData.fbc = fbc;
  }
  return userData;
}

export function buildMetaEventBody(
  input: MetaEventInput,
  testEventCode: string | null,
): Record<string, unknown> {
  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: "website",
    user_data: buildMetaUserData(input.userData),
  };
  if (input.eventSourceUrl) {
    event.event_source_url = input.eventSourceUrl;
  }
  if (input.customData && Object.keys(input.customData).length > 0) {
    event.custom_data = input.customData;
  }
  const body: Record<string, unknown> = { data: [event] };
  if (testEventCode) {
    body.test_event_code = testEventCode;
  }
  return body;
}

function logResult(input: MetaEventInput, result: MetaCapiResult): void {
  const label = `${input.eventName} event_id=${input.eventId}`;
  if (result.ok) {
    console.info(
      `[meta-capi] sent ${label} events_received=${result.eventsReceived ?? "?"}`,
    );
  } else {
    console.warn(`[meta-capi] failed ${label}: ${result.reason}`);
  }
}

function metaErrorMessage(status: number, text: string): string {
  try {
    const parsed = JSON.parse(text) as {
      error?: {
        message?: string;
        code?: number;
        error_subcode?: number;
        fbtrace_id?: string;
      };
    };
    if (parsed.error?.message) {
      const {
        message,
        code,
        error_subcode: sub,
        fbtrace_id: trace,
      } = parsed.error;
      return `HTTP ${status} code=${code ?? "?"}${sub ? `/${sub}` : ""} ${message}${trace ? ` (fbtrace_id ${trace})` : ""}`;
    }
  } catch {
    // Not JSON — fall through to the raw text.
  }
  return `HTTP ${status} ${text.slice(0, 300)}`;
}

/**
 * Sends one event and logs the outcome. Resolves (never rejects) with the
 * result; resolves `{ ok:false }` without a request when not configured.
 */
export async function sendMetaEvent(
  input: MetaEventInput,
): Promise<MetaCapiResult> {
  let result: MetaCapiResult;
  try {
    const config = await resolveMetaCapiConfig();
    if (!config) {
      // Not configured is the normal state on most installs — not logged.
      return { ok: false, reason: "Meta CAPI is not configured." };
    }
    const body = buildMetaEventBody(input, config.testEventCode);
    // Token in the POST body rather than the query string, so it cannot end
    // up in a proxy access log alongside the URL.
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, access_token: config.accessToken }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      },
    );
    const text = await response.text().catch(() => "");
    if (!response.ok) {
      result = { ok: false, reason: metaErrorMessage(response.status, text) };
    } else {
      let eventsReceived: number | null = null;
      try {
        const parsed = JSON.parse(text) as { events_received?: unknown };
        eventsReceived =
          typeof parsed.events_received === "number"
            ? parsed.events_received
            : null;
      } catch {
        eventsReceived = null;
      }
      result = { ok: true, eventsReceived };
    }
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    result = {
      ok: false,
      reason: timedOut
        ? `timed out after ${REQUEST_TIMEOUT_MS} ms`
        : error instanceof Error
          ? error.message
          : "request failed",
    };
  }
  logResult(input, result);
  return result;
}

/**
 * Runs `task` after the response is sent (`after()`), or fire-and-forget when
 * called outside a request (scripts, tests). Never throws.
 */
export function runAfterResponse(task: () => Promise<unknown>): void {
  const safe = () => task().catch(() => {});
  try {
    after(safe);
  } catch {
    void safe();
  }
}

// ---------------------------------------------------------------------------
// Purchase — built from the database order, never from browser input
// ---------------------------------------------------------------------------

export function confirmationUrlForOrder(orderNumber: string): string {
  return `${publicOrigin()}/checkout/confirmation?order=${encodeURIComponent(orderNumber)}`;
}

export type PurchaseOrderRow = {
  number: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  fbp: string | null;
  fbc: string | null;
  clientIp: string | null;
  clientUserAgent: string | null;
  items: {
    sku: string;
    productName: string;
    quantity: number;
    unitAmount: number;
    product: { sku: string; name?: string } | null;
  }[];
};

/**
 * Purchase event from an order row. `content_ids` / `contents` use the
 * PARENT `Product.sku` (the catalog feed id), falling back to the line's
 * snapshot SKU only when the product has since been deleted.
 */
export function buildPurchaseEvent(order: PurchaseOrderRow): MetaEventInput {
  const items: TrackItem[] = order.items.map((line) => ({
    id: line.product?.sku ?? line.sku,
    // Parent name like the browser events; the line snapshot is the variant
    // title (AD-390).
    name: line.product?.name ?? line.productName,
    price: line.unitAmount,
    quantity: line.quantity,
  }));
  return {
    eventName: "Purchase",
    eventId: order.number,
    eventSourceUrl: confirmationUrlForOrder(order.number),
    userData: {
      email: order.customerEmail,
      phone: order.customerPhone,
      fullName: order.customerName,
      clientIpAddress: order.clientIp,
      clientUserAgent: order.clientUserAgent,
      fbp: order.fbp,
      fbc: order.fbc,
    },
    customData: toMeta("Purchase", {
      items,
      value: order.totalAmount,
      transactionId: order.number,
    }) ?? { currency: TRACK_CURRENCY, value: order.totalAmount },
  };
}

export async function sendMetaPurchaseForOrder(
  orderId: string,
): Promise<MetaCapiResult> {
  if (!usesDatabase()) {
    return { ok: false, reason: "Meta CAPI needs the database." };
  }
  // Checked before the order query so an unconfigured install costs nothing.
  if (!(await isMetaCapiConfigured())) {
    return { ok: false, reason: "Meta CAPI is not configured." };
  }
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    select: {
      number: true,
      totalAmount: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      fbp: true,
      fbc: true,
      clientIp: true,
      clientUserAgent: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          sku: true,
          productName: true,
          quantity: true,
          unitAmount: true,
          product: { select: { sku: true, name: true } },
        },
      },
    },
  });
  if (!order) {
    return { ok: false, reason: "Order was not found." };
  }
  return sendMetaEvent(buildPurchaseEvent(order));
}

/** Queue the server Purchase without delaying the response. Never throws. */
export function queueMetaPurchaseForOrder(orderId: string): void {
  runAfterResponse(() => sendMetaPurchaseForOrder(orderId));
}
