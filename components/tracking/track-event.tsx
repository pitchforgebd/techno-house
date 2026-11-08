"use client";

import { useEffect, useRef } from "react";
import type { TrackData, TrackEventName } from "@/lib/tracking/events";
import { runOncePerKey, track } from "@/lib/tracking/track";

/**
 * Fires one tracking event when it mounts, and again only when `eventKey`
 * changes (e.g. a new search term or listing page). Lets a server component
 * emit a page-level event (view_item, search, purchase) with server data.
 *
 * `onceKey` makes it fire at most once per key across reloads — Purchase uses
 * the order number so a refreshed confirmation page is not a second sale.
 */
export function TrackEvent({
  name,
  data,
  eventKey,
  eventId,
  onceKey,
}: {
  name: TrackEventName;
  data: TrackData;
  eventKey: string;
  eventId?: string;
  onceKey?: string;
}) {
  const lastKey = useRef<string | null>(null);
  // Latest data without making it an effect dependency: the object is
  // rebuilt every render, the key is what says "this is a new event".
  const latest = useRef({ name, data, eventId, onceKey });
  useEffect(() => {
    latest.current = { name, data, eventId, onceKey };
  });

  useEffect(() => {
    if (lastKey.current === eventKey) {
      return;
    }
    lastKey.current = eventKey;
    const current = latest.current;
    if (current.onceKey) {
      runOncePerKey(current.onceKey, () =>
        track(current.name, current.data, current.eventId),
      );
      return;
    }
    track(current.name, current.data, current.eventId);
  }, [eventKey]);

  return null;
}
