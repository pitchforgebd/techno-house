"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/cn";
import type { StaffOrderAlert } from "@/lib/orders/staff-order-alerts";

type AlertsPayload = {
  unreadCount: number;
  items: StaffOrderAlert[];
};

const POLL_MS = 5_000;
const ALERTS_URL = "/admin/api/order-alerts";

type AudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext;
};

let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;
let chimePending = false;

function getOrderAlertAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (sharedAudioCtx) {
    return sharedAudioCtx;
  }
  const AudioCtx =
    window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioCtx) {
    return null;
  }
  sharedAudioCtx = new AudioCtx();
  return sharedAudioCtx;
}

function emitOrderChime(ctx: AudioContext): void {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
  gain.connect(ctx.destination);

  for (const [index, freq] of [880, 1174, 1318].entries()) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    osc.connect(gain);
    const start = now + index * 0.12;
    osc.start(start);
    osc.stop(start + 0.32);
  }
}

/** Browsers block AudioContext until a user gesture — unlock early. */
async function unlockOrderAlertAudio(): Promise<void> {
  const ctx = getOrderAlertAudioContext();
  if (!ctx) {
    return;
  }
  try {
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    audioUnlocked = ctx.state === "running";
    if (audioUnlocked && chimePending) {
      chimePending = false;
      emitOrderChime(ctx);
    }
  } catch {
    audioUnlocked = false;
  }
}

function playOrderChime(): void {
  const ctx = getOrderAlertAudioContext();
  if (!ctx) {
    return;
  }
  if (ctx.state === "suspended" || !audioUnlocked) {
    chimePending = true;
    void unlockOrderAlertAudio();
    return;
  }
  try {
    emitOrderChime(ctx);
  } catch {
    chimePending = true;
  }
}

function maybeBrowserNotify(alert: StaffOrderAlert): void {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  try {
    const note = new Notification(alert.title, {
      body: alert.body,
      tag: alert.id,
    });
    note.onclick = () => {
      window.focus();
      window.location.href = alert.href || "/admin/orders";
      note.close();
    };
  } catch {
    // Ignore notification construction failures.
  }
}

export function AdminOrderAlertBell() {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const knownUnreadIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<AlertsPayload>({
    unreadCount: 0,
    items: [],
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(ALERTS_URL, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as AlertsPayload;
      const unread = data.items.filter((item) => !item.readAt);
      const unreadIds = new Set(unread.map((item) => item.id));

      if (primed.current) {
        const fresh = unread.filter((item) => !knownUnreadIds.current.has(item.id));
        if (fresh.length > 0) {
          playOrderChime();
          maybeBrowserNotify(fresh[0]!);
        }
      } else {
        primed.current = true;
      }

      knownUnreadIds.current = unreadIds;
      setPayload({
        unreadCount: data.unreadCount,
        items: data.items,
      });
    } catch {
      // Keep last good snapshot when the network blips.
    }
  }, []);

  useEffect(() => {
    // This effect subscribes to external systems — a poll timer, the page
    // visibility API, and a one-shot gesture listener that unlocks audio — and
    // the state it writes happens inside `refresh`'s async fetch callback,
    // which is the shape React's own guidance calls a correct use of an
    // effect.
    //
    // `react-hooks/set-state-in-effect` cannot see through `void refresh()` to
    // tell that the setState is asynchronous, so it reports this as a
    // synchronous cascade. The alternative — letting the interval fire the
    // first fetch — would leave the bell blank for a full POLL_MS on every
    // page load, which is a worse product for no real gain.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    function onVisible() {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    }
    function onGesture() {
      void unlockOrderAlertAudio();
    }
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("pointerdown", onGesture, { once: true });
    document.addEventListener("keydown", onGesture, { once: true });
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      document.removeEventListener("pointerdown", onGesture);
      document.removeEventListener("keydown", onGesture);
    };
  }, [refresh]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    try {
      const res = await fetch(ALERTS_URL, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        return;
      }
      const data = (await res.json()) as AlertsPayload;
      knownUnreadIds.current = new Set();
      setPayload(data);
    } catch {
      // ignore
    }
  }

  async function enableBrowserPush() {
    if (!("Notification" in window)) {
      return;
    }
    if (Notification.permission === "granted") {
      return;
    }
    if (Notification.permission !== "denied") {
      await Notification.requestPermission();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="relative inline-flex size-9 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
        aria-label={
          payload.unreadCount > 0
            ? `Notifications, ${payload.unreadCount} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          void unlockOrderAlertAudio();
          setOpen((value) => !value);
          void enableBrowserPush();
        }}
      >
        <Bell className="size-4" aria-hidden />
        {payload.unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[0.65rem] font-semibold leading-4 text-white">
            {payload.unreadCount > 9 ? "9+" : payload.unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-2">
            <p className="text-sm font-semibold text-neutral-800">
              Notifications
            </p>
            <div className="flex items-center gap-2">
              {payload.unreadCount > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-[#2f86d8] hover:underline"
                  onClick={() => {
                    void markAllRead();
                  }}
                >
                  Mark all read
                </button>
              ) : null}
            </div>
          </div>

          <ul className="max-h-80 overflow-y-auto">
            {payload.items.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-neutral-500">
                No notifications yet.
              </li>
            ) : (
              payload.items.map((item) => (
                <li key={item.id} className="border-b border-neutral-50 last:border-0">
                  <Link
                    href={item.href || "/admin"}
                    className={cn(
                      "block px-3 py-2.5 hover:bg-neutral-50",
                      !item.readAt && "bg-[#3897f0]/5",
                    )}
                    onClick={() => {
                      setOpen(false);
                      void fetch(ALERTS_URL, {
                        method: "POST",
                        credentials: "same-origin",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ids: [item.id] }),
                      }).then(async (res) => {
                        if (!res.ok) {
                          return;
                        }
                        const data = (await res.json()) as AlertsPayload;
                        knownUnreadIds.current = new Set(
                          data.items
                            .filter((row) => !row.readAt)
                            .map((row) => row.id),
                        );
                        setPayload(data);
                      });
                    }}
                  >
                    <p className="text-sm font-medium text-neutral-900">
                      {item.title}
                    </p>
                    {item.body ? (
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {item.body}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
