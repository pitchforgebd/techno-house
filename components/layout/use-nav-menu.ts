"use client";

import { useCallback, useEffect, useState } from "react";
import type { NavMenuPayload } from "@/lib/catalog/nav-menu";

/**
 * Lazily loaded menu data (`/api/nav-menu`, SEO phase 4). One fetch per page
 * load, shared by the desktop mega-menu and the mobile drawer; a failed fetch
 * is retried on the next use. Until it arrives the department links still
 * work as plain links.
 */
let payload: NavMenuPayload | null = null;
let pending: Promise<NavMenuPayload | null> | null = null;
const listeners = new Set<(data: NavMenuPayload) => void>();

function fetchNavMenu(): Promise<NavMenuPayload | null> {
  if (payload) {
    return Promise.resolve(payload);
  }
  if (!pending) {
    pending = fetch("/api/nav-menu", { credentials: "omit" })
      .then((response) => (response.ok ? (response.json() as Promise<NavMenuPayload>) : null))
      .then((data) => {
        if (data) {
          payload = data;
          for (const listener of listeners) {
            listener(data);
          }
        }
        return data;
      })
      .catch(() => null)
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

export function useNavMenu(): {
  data: NavMenuPayload | null;
  /** Start loading (idempotent) — call on hover/focus/open. */
  load: () => void;
} {
  const [data, setData] = useState<NavMenuPayload | null>(payload);
  useEffect(() => {
    listeners.add(setData);
    return () => {
      listeners.delete(setData);
    };
  }, []);
  const load = useCallback(() => {
    void fetchNavMenu();
  }, []);
  return { data, load };
}
