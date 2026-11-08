"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import type { TrackItem } from "@/lib/tracking/events";
import { track } from "@/lib/tracking/track";

function productSlugFromHref(href: string): string | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) {
      return null;
    }
    const match = /^\/product\/([^/?#]+)/.exec(url.pathname);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

/**
 * Wraps a server-rendered product grid (AD-389): fires view_item_list for the
 * items shown, and select_item when a product link inside is clicked. The
 * cards stay server components — clicks are read in the capture phase from
 * the link's `/product/<slug>` href. `display: contents` keeps the wrapper
 * out of the grid's layout.
 */
export function TrackedProductList({
  listId,
  listName,
  items,
  children,
}: {
  listId: string;
  listName: string;
  items: TrackItem[];
  children: ReactNode;
}) {
  const listKey = `${listId}|${items.map((item) => item.id).join(",")}`;
  const lastKey = useRef<string | null>(null);
  const latest = useRef({ listId, listName, items });
  useEffect(() => {
    latest.current = { listId, listName, items };
  });

  useEffect(() => {
    if (lastKey.current === listKey || latest.current.items.length === 0) {
      return;
    }
    lastKey.current = listKey;
    const current = latest.current;
    track("ViewItemList", {
      listId: current.listId,
      listName: current.listName,
      items: current.items,
    });
  }, [listKey]);

  return (
    <div
      className="contents"
      onClickCapture={(event) => {
        const target = event.target;
        if (!(target instanceof Element)) {
          return;
        }
        const href = target.closest("a[href]")?.getAttribute("href");
        const slug = href ? productSlugFromHref(href) : null;
        if (!slug) {
          return;
        }
        const item = latest.current.items.find((entry) => entry.slug === slug);
        if (item) {
          track("SelectItem", {
            listId: latest.current.listId,
            listName: latest.current.listName,
            items: [item],
          });
        }
      }}
    >
      {children}
    </div>
  );
}
