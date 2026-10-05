"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SaleAlertEvent } from "@/lib/marketing/sale-alerts";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

const VISIBLE_MS = 6000;

export function SaleAlertToast({
  events,
  minIntervalSeconds,
  maxIntervalSeconds,
}: {
  events: SaleAlertEvent[];
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
}) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (events.length === 0) {
      return;
    }
    const min = Math.max(1, minIntervalSeconds) * 1000;
    const max = Math.max(min, maxIntervalSeconds * 1000);
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      const delay = min + Math.random() * (max - min);
      showTimer = setTimeout(() => {
        setVisible(true);
        hideTimer = setTimeout(() => {
          setVisible(false);
          setIndex((current) => (current + 1) % events.length);
          scheduleNext();
        }, VISIBLE_MS);
      }, delay);
    }

    scheduleNext();
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events.length, minIntervalSeconds, maxIntervalSeconds]);

  if (events.length === 0 || !visible) {
    return null;
  }

  const event = events[index % events.length];
  if (!event) {
    return null;
  }

  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
      <span className="flex size-2 shrink-0 animate-pulse rounded-full bg-emerald-500" aria-hidden />
      <div className="min-w-0 text-sm text-neutral-800">
        <p className="truncate font-medium">
          {event.areaLabel ? `Someone from ${event.areaLabel}` : "Someone"} bought{" "}
          {event.productName}
        </p>
        <p className="text-xs text-neutral-400">{relativeTime(event.placedAt)}</p>
      </div>
    </div>
  );

  return (
    // Fixed bottom-left, matching the conventional sale-alert widget
    // position. Can visually stack with a Custom Alert also set to
    // bottom-left — a known, minor limitation (see AD-260 notes).
    <div className="th-jump-in fixed bottom-4 left-4 z-90 w-full max-w-xs">
      {event.productSlug ? (
        <Link href={`/product/${event.productSlug}`}>{content}</Link>
      ) : (
        content
      )}
    </div>
  );
}
