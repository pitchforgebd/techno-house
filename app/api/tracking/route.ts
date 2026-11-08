/**
 * Server relay for browser tracking events → Meta Conversions API (AD-389).
 *
 * The browser `track()` posts Meta-eligible events here with the same
 * `eventId` it pushed to the dataLayer, so Meta deduplicates this server copy
 * against the GTM pixel event. Only the "Server relay: yes" events are
 * accepted; Purchase is NOT — the server sends it from the order row.
 *
 * Always answers 204 with no body: an ignored, invalid or rate-limited event
 * looks exactly like a relayed one, and nothing here can fail a page.
 */
import { getRequestMeta } from "@/lib/auth/request-meta";
import { isSameOriginRequest } from "@/lib/auth/same-origin";
import {
  resolveMetaCapiConfig,
  runAfterResponse,
  sendMetaEvent,
} from "@/lib/analytics/meta-capi";
import { publicOrigin } from "@/lib/seo/public-origin";
import {
  RELAY_EVENT_NAMES,
  isTrackEventName,
  sanitizeRelayData,
  toMeta,
  TRACK_EVENTS,
} from "@/lib/tracking/events";
import { sanitizeFbCookie } from "@/lib/tracking/match-keys";

const MAX_BODY_BYTES = 16 * 1024;
const EVENT_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Per-process sliding-window limit per client IP. In memory on purpose: the
 * database-backed auth limiter would cost two writes for every product view.
 * A restart resets it, which is fine for a spam brake.
 */
const RATE_LIMIT = { max: 60, windowMs: 60_000 };
const MAX_TRACKED_IPS = 10_000;
const hits = new Map<string, number[]>();

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter(
    (at) => now - at < RATE_LIMIT.windowMs,
  );
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > MAX_TRACKED_IPS) {
    const oldest = hits.keys().next().value;
    if (oldest !== undefined) {
      hits.delete(oldest);
    }
  }
  return true;
}

function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** Only a URL on this site is forwarded as `event_source_url`. */
function sameSiteUrl(raw: unknown): string {
  const origin = publicOrigin();
  if (typeof raw === "string" && raw.length <= 2000) {
    try {
      const url = new URL(raw);
      const allowed = new URL(origin);
      if (url.host === allowed.host) {
        return url.toString();
      }
    } catch {
      // Fall through to the site root.
    }
  }
  return `${origin}/`;
}

export async function POST(request: Request): Promise<Response> {
  try {
    if (!(await isSameOriginRequest())) {
      return noContent();
    }
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY_BYTES) {
      return noContent();
    }
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return noContent();
    }
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return noContent();
    }
    if (!body || typeof body !== "object") {
      return noContent();
    }
    const { name, eventId, relay } = body as Record<string, unknown>;
    if (!isTrackEventName(name) || !RELAY_EVENT_NAMES.has(name)) {
      return noContent();
    }
    if (typeof eventId !== "string" || !EVENT_ID_PATTERN.test(eventId)) {
      return noContent();
    }
    const data = sanitizeRelayData(relay);
    if (!data) {
      return noContent();
    }

    const meta = await getRequestMeta();
    if (!allowRequest(meta.ip ?? "unknown")) {
      return noContent();
    }
    if (!(await resolveMetaCapiConfig())) {
      return noContent();
    }

    const relayFields = relay as Record<string, unknown>;
    const metaEventName = TRACK_EVENTS[name].meta;
    if (!metaEventName) {
      return noContent();
    }
    const input = {
      eventName: metaEventName,
      eventId,
      eventSourceUrl: sameSiteUrl(relayFields.url),
      userData: {
        clientIpAddress: meta.ip,
        clientUserAgent: meta.userAgent,
        fbp: sanitizeFbCookie(relayFields.fbp),
        fbc: sanitizeFbCookie(relayFields.fbc),
      },
      customData: toMeta(name, data),
    };
    runAfterResponse(() => sendMetaEvent(input));
    return noContent();
  } catch {
    return noContent();
  }
}
