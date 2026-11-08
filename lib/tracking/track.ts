/**
 * Browser-side tracking (AD-389): pushes GA4 ecommerce events to
 * `window.dataLayer` for GTM, and relays Meta-eligible events to
 * `/api/tracking` for a server-side Conversions API copy with the same
 * `event_id` (so Meta deduplicates the pixel and server events).
 *
 * Never loads gtag.js or fbq — GTM owns both. Every function is a no-op on
 * the server and swallows its own failures: tracking must never break a page.
 */
import {
  RELAY_LIMITS,
  TRACK_CURRENCY,
  TRACK_EVENTS,
  eventValue,
  toGa4,
  toMeta,
  type RelayPayload,
  type TrackData,
  type TrackEventName,
} from "@/lib/tracking/events";
import { sanitizeFbCookie, sanitizeFbclid } from "@/lib/tracking/match-keys";

type DataLayerWindow = Window & { dataLayer?: unknown[] };

const FBCLID_STORAGE_KEY = "th_fbclid";
const TRACKED_ONCE_KEY = "th_tracked_once";
const TRACKED_ONCE_MAX = 50;
/** Meta treats a click id as attributable for 90 days. */
const FBCLID_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const trackedThisPage = new Set<string>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function newEventId(): string {
  try {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

function readCookie(name: string): string | null {
  try {
    const prefix = `${name}=`;
    for (const part of document.cookie.split(";")) {
      const trimmed = part.trim();
      if (trimmed.startsWith(prefix)) {
        return decodeURIComponent(trimmed.slice(prefix.length));
      }
    }
  } catch {
    // Cookie access can throw in sandboxed contexts.
  }
  return null;
}

/** Called once per full page load: remembers an ad click id from the landing URL. */
export function captureFbclid(): void {
  if (!isBrowser()) {
    return;
  }
  try {
    const fbclid = sanitizeFbclid(
      new URLSearchParams(window.location.search).get("fbclid"),
    );
    if (fbclid) {
      window.localStorage.setItem(
        FBCLID_STORAGE_KEY,
        JSON.stringify({ v: fbclid, t: Date.now() }),
      );
    }
  } catch {
    // Storage blocked — the _fbc cookie GTM's pixel sets still works.
  }
}

/**
 * Meta browser identifiers: the `_fbp` / `_fbc` cookies the pixel sets, or,
 * when `_fbc` is missing, one rebuilt from a remembered `fbclid`.
 */
export function readAdIdentifiers(): {
  fbp: string | null;
  fbc: string | null;
} {
  if (!isBrowser()) {
    return { fbp: null, fbc: null };
  }
  const fbp = sanitizeFbCookie(readCookie("_fbp"));
  let fbc = sanitizeFbCookie(readCookie("_fbc"));
  if (!fbc) {
    try {
      const raw = window.localStorage.getItem(FBCLID_STORAGE_KEY);
      const stored = raw
        ? (JSON.parse(raw) as { v?: unknown; t?: unknown })
        : null;
      const clickId = sanitizeFbclid(stored?.v);
      const at = typeof stored?.t === "number" ? stored.t : 0;
      if (clickId && at > 0 && Date.now() - at < FBCLID_MAX_AGE_MS) {
        fbc = sanitizeFbCookie(`fb.1.${at}.${clickId}`);
      }
    } catch {
      // Unreadable storage — no fbc.
    }
  }
  return { fbp, fbc };
}

function relay(name: TrackEventName, eventId: string, data: TrackData): void {
  try {
    const ids = readAdIdentifiers();
    const relayPayload: RelayPayload = {
      url: window.location.href,
      items: (data.items ?? []).slice(0, RELAY_LIMITS.maxItems).map((item) => ({
        id: item.id,
        name: item.name.slice(0, RELAY_LIMITS.maxText),
        price: item.price,
        quantity: item.quantity,
      })),
      value: eventValue(data),
      currency: TRACK_CURRENCY,
      searchTerm: data.searchTerm,
      method: data.method,
      leadType: data.leadType,
      fbp: ids.fbp,
      fbc: ids.fbc,
    };
    void fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, eventId, relay: relayPayload }),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => {});
  } catch {
    // Relay is best-effort.
  }
}

/**
 * Track one event. `eventId` defaults to a fresh UUID; pass the order number
 * for Purchase so the server CAPI copy deduplicates against it.
 */
export function track(
  name: TrackEventName,
  data: TrackData = {},
  eventId?: string,
): void {
  if (!isBrowser()) {
    return;
  }
  const def = TRACK_EVENTS[name];
  // PageView: GTM's GA4 tag and Meta Pixel - Base already send it.
  if (!def || !def.ga4) {
    return;
  }
  try {
    const id = eventId?.trim() || newEventId();
    const w = window as DataLayerWindow;
    w.dataLayer = w.dataLayer || [];
    const ga4 = toGa4(name, data);
    const push: Record<string, unknown> = {
      event: def.ga4,
      event_id: id,
      ...ga4.params,
    };
    if (def.ecommerce) {
      // Clears the previous ecommerce object in GTM's data model.
      w.dataLayer.push({ ecommerce: null });
      push.ecommerce = ga4.ecommerce;
    }
    const metaParams = toMeta(name, data);
    if (def.meta && metaParams) {
      push.meta = { event: def.meta, params: metaParams };
    }
    w.dataLayer.push(push);
    if (def.relay) {
      relay(name, id, data);
    }
  } catch {
    // Never let tracking break the page.
  }
}

/**
 * Runs `fn` once per key across reloads (localStorage), falling back to once
 * per page load when storage is unavailable. Used for Purchase.
 */
export function runOncePerKey(key: string, fn: () => void): void {
  if (!isBrowser() || trackedThisPage.has(key)) {
    return;
  }
  trackedThisPage.add(key);
  let seen: string[] = [];
  try {
    const raw = window.localStorage.getItem(TRACKED_ONCE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    seen = Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    seen = [];
  }
  if (seen.includes(key)) {
    return;
  }
  fn();
  try {
    window.localStorage.setItem(
      TRACKED_ONCE_KEY,
      JSON.stringify([...seen, key].slice(-TRACKED_ONCE_MAX)),
    );
  } catch {
    // Storage blocked — the in-memory guard above still holds for this page.
  }
}
