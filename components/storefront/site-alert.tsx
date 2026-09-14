"use client";

import { ArrowRight, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import type { StorefrontAlert } from "@/lib/marketing/alerts";

const SEEN_KEY_PREFIX = "th-alert-seen-";

const POSITION_CLASS: Record<StorefrontAlert["location"], string> = {
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
};

/**
 * How far the alert travels on entry, and in which direction. Each corner
 * animates away from its own screen edge — top alerts drop in, bottom alerts
 * rise — so the motion reads as the alert arriving from off-screen. Consumed
 * by the `th-alert-in` / `th-alert-out` keyframes in globals.css.
 */
const ENTER_OFFSET: Record<StorefrontAlert["location"], string> = {
  "bottom-left": "16px",
  "bottom-right": "16px",
  "top-left": "-16px",
  "top-right": "-16px",
};

/**
 * `sessionStorage` is client-only, so a lazy `useState` initialiser would
 * disagree with the server render and break hydration, and reading it in an
 * effect means a synchronous setState on mount. `useSyncExternalStore` is the
 * supported way to read a client-only value: the subscribe callback is
 * deliberately inert, since nothing outside this component writes the key.
 */
const NEVER_CHANGES_EXTERNALLY = () => () => {};

function useDismissedThisSession(alertId: string | undefined): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES_EXTERNALLY,
    () => {
      if (!alertId) {
        return true;
      }
      try {
        return sessionStorage.getItem(SEEN_KEY_PREFIX + alertId) === "1";
      } catch {
        // Private browsing / storage blocked — treat as not dismissed.
        return false;
      }
    },
    // Server render: assume dismissed, so the alert always arrives with its
    // entrance animation after hydration instead of popping in fully formed.
    () => true,
  );
}

/**
 * The corner Custom Alert (Admin -> Marketing -> Custom Alerts).
 *
 * Auto-close pauses while the alert is hovered or holds keyboard focus — an
 * alert that expires mid-sentence, or out from under the Tab key, is the main
 * way this kind of widget annoys people. The countdown bar and the JS timer
 * pause together, so the bar never disagrees with the time actually left.
 */
export function SiteAlert({ alert }: { alert: StorefrontAlert | null }) {
  const dismissed = useDismissedThisSession(alert?.id);
  const [exiting, setExiting] = useState(false);
  const [paused, setPaused] = useState(false);
  const countdownRef = useRef<{ id: string | null; remainingMs: number }>({
    id: null,
    remainingMs: 0,
  });

  const shown = Boolean(alert) && !dismissed;

  const markDismissed = useCallback(() => {
    if (!alert) {
      return;
    }
    try {
      sessionStorage.setItem(SEEN_KEY_PREFIX + alert.id, "1");
    } catch {
      // Ignore — worst case the alert can reappear this session.
    }
  }, [alert]);

  /**
   * Starts the exit animation. Nothing is written to storage yet: `shown` is
   * derived from that flag, so setting it here would unmount the alert
   * mid-animation. The animationend handler writes it once the exit has played.
   */
  const requestClose = useCallback(() => {
    setExiting(true);
  }, []);

  // Auto-close. Re-running on `paused` is what implements the pause: the
  // cleanup banks however much of the countdown was left, and the next run
  // starts a fresh timer for exactly that remainder.
  useEffect(() => {
    const totalMs = (alert?.autoCloseSeconds ?? 0) * 1000;
    if (!alert || !shown || exiting || totalMs <= 0) {
      return;
    }
    const countdown = countdownRef.current;
    if (countdown.id !== alert.id) {
      countdown.id = alert.id;
      countdown.remainingMs = totalMs;
    }
    if (paused) {
      return;
    }
    const startedAt = Date.now();
    const timer = setTimeout(requestClose, Math.max(0, countdown.remainingMs));
    return () => {
      clearTimeout(timer);
      countdown.remainingMs -= Date.now() - startedAt;
    };
  }, [alert, shown, exiting, paused, requestClose]);

  if (!alert || !shown) {
    return null;
  }

  const large = alert.size === "large";
  const light = alert.textTone === "light";

  return (
    <div
      className={`th-alert fixed z-90 w-[calc(100vw-2rem)] ${POSITION_CLASS[alert.location]} ${
        large ? "max-w-sm sm:max-w-md" : "max-w-xs sm:max-w-sm"
      }`}
      // Custom property read by the entrance keyframes; cast because React's
      // CSSProperties does not model custom properties.
      style={{ "--th-alert-from": ENTER_OFFSET[alert.location] } as CSSProperties}
      data-exiting={exiting ? "true" : undefined}
      onAnimationEnd={(event) => {
        // The countdown bar bubbles its own animationend through here.
        if (exiting && event.target === event.currentTarget) {
          markDismissed();
          setExiting(false);
        }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // React maps these to focusin/focusout, so they fire for focus landing
      // anywhere inside the alert — the link and the close button included.
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="status"
      aria-live="polite"
    >
      <div
        className={`th-alert-card relative overflow-hidden rounded-xl ${
          large ? "min-h-25 p-4" : "p-3.5"
        }`}
        style={{
          backgroundColor: alert.backgroundColor,
          color: light ? "#ffffff" : "var(--color-text)",
        }}
      >
        <div className="flex items-center gap-3">
          {alert.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={alert.imagePath}
              alt=""
              className={`${large ? "size-16" : "size-12"} shrink-0 rounded-lg object-cover`}
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <p
              className={`${large ? "text-sm" : "text-[0.8125rem]"} font-medium leading-snug text-pretty`}
            >
              {alert.text}
            </p>
            {alert.link && alert.linkLabel ? (
              <a
                href={alert.link}
                className="th-alert-tint mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                {alert.linkLabel}
                <ArrowRight className="size-3.5" aria-hidden />
              </a>
            ) : null}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="th-alert-tint -mr-1 flex size-7 shrink-0 items-center justify-center rounded-full border opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
        {alert.autoCloseSeconds ? (
          <div
            className="th-alert-timer absolute inset-x-0 bottom-0 h-0.5 opacity-55"
            style={{ animationDuration: `${alert.autoCloseSeconds}s` }}
            data-paused={paused ? "true" : undefined}
            aria-hidden
          />
        ) : null}
      </div>
    </div>
  );
}
