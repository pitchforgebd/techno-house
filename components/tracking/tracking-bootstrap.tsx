"use client";

import { useEffect } from "react";
import { AUTH_EVENT_COOKIE, parseAuthEvent } from "@/lib/tracking/auth-event";
import { captureFbclid, track } from "@/lib/tracking/track";

/**
 * WhatsApp chat links (wa.me/<number>, api.whatsapp.com/send?phone=…) — a
 * share link (`wa.me/?text=…`) has no number and is deliberately not a Lead.
 */
const WHATSAPP_CHAT =
  /^https?:\/\/(?:wa\.me\/\d|api\.whatsapp\.com\/send\?(?:[^#]*&)?phone=\d)/i;

function leadTypeForHref(href: string): "whatsapp" | "call" | null {
  if (/^tel:/i.test(href)) {
    return "call";
  }
  if (WHATSAPP_CHAT.test(href)) {
    return "whatsapp";
  }
  return null;
}

function consumeAuthEventCookie(): void {
  try {
    const prefix = `${AUTH_EVENT_COOKIE}=`;
    const entry = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(prefix));
    if (!entry) {
      return;
    }
    document.cookie = `${AUTH_EVENT_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    const parsed = parseAuthEvent(
      decodeURIComponent(entry.slice(prefix.length)),
    );
    if (!parsed) {
      return;
    }
    track(parsed.kind === "sign_up" ? "CompleteRegistration" : "Login", {
      method: parsed.method,
    });
  } catch {
    // Tracking only.
  }
}

/**
 * Storefront-wide tracking glue (AD-389), mounted once in the storefront
 * layout: remembers an ad click id, fires a sign-up/login that finished in a
 * server redirect, and turns every WhatsApp-chat / phone-call link click —
 * floating widget, product page, header, footer, admin-authored HTML — into a
 * Lead, without each of those components having to know about tracking.
 */
export function TrackingBootstrap() {
  useEffect(() => {
    captureFbclid();
    consumeAuthEventCookie();

    function onClick(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest("a[href]");
      const href = anchor?.getAttribute("href");
      const leadType = href ? leadTypeForHref(href) : null;
      if (leadType) {
        track("Lead", { leadType });
      }
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
