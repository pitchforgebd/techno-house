"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  EMPTY_LISTS,
  LISTS_STORAGE_KEY,
  MAX_COMPARE,
  MAX_WISHLIST,
  type CompareAddResult,
  type CompareEntry,
  type ListsState,
} from "@/lib/catalog/lists";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: ListsState = EMPTY_LISTS;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function sameLists(a: ListsState, b: ListsState): boolean {
  if (a === b) {
    return true;
  }
  if (
    a.wishlist.length !== b.wishlist.length ||
    a.compare.length !== b.compare.length
  ) {
    return false;
  }
  if (a.wishlist.some((slug, index) => slug !== b.wishlist[index])) {
    return false;
  }
  return a.compare.every(
    (entry, index) =>
      entry.slug === b.compare[index]?.slug &&
      entry.categorySlug === b.compare[index]?.categorySlug,
  );
}

function normalizeCompare(raw: unknown): CompareEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const entries: CompareEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string") {
      continue;
    }
    if (
      item &&
      typeof item === "object" &&
      typeof (item as CompareEntry).slug === "string" &&
      typeof (item as CompareEntry).categorySlug === "string"
    ) {
      entries.push({
        slug: (item as CompareEntry).slug,
        categorySlug: (item as CompareEntry).categorySlug,
      });
    }
  }
  return entries;
}

function readStorage(): ListsState {
  if (typeof window === "undefined") {
    return EMPTY_LISTS;
  }
  try {
    const raw = window.localStorage.getItem(LISTS_STORAGE_KEY);
    if (!raw) {
      return EMPTY_LISTS;
    }
    const parsed = JSON.parse(raw) as Partial<ListsState>;
    return {
      wishlist: Array.isArray(parsed.wishlist)
        ? parsed.wishlist.filter((s): s is string => typeof s === "string")
        : [],
      compare: normalizeCompare(parsed.compare),
    };
  } catch {
    return EMPTY_LISTS;
  }
}

function writeStorage(state: ListsState) {
  window.localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(state));
  cached = state;
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ListsState {
  const next = readStorage();
  if (sameLists(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): ListsState {
  return EMPTY_LISTS;
}

export function useListsStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleWishlist = useCallback((slug: string) => {
    const current = readStorage();
    const exists = current.wishlist.includes(slug);
    const wishlist = exists
      ? current.wishlist.filter((item) => item !== slug)
      : [...current.wishlist, slug].slice(0, MAX_WISHLIST);
    writeStorage({ ...current, wishlist });
  }, []);

  const removeWishlist = useCallback((slug: string) => {
    const current = readStorage();
    writeStorage({
      ...current,
      wishlist: current.wishlist.filter((item) => item !== slug),
    });
  }, []);

  const clearWishlist = useCallback(() => {
    const current = readStorage();
    writeStorage({ ...current, wishlist: [] });
  }, []);

  const toggleCompare = useCallback(
    (slug: string, categorySlug: string): CompareAddResult => {
      const current = readStorage();
      if (current.compare.some((entry) => entry.slug === slug)) {
        const next = {
          ...current,
          compare: current.compare.filter((entry) => entry.slug !== slug),
        };
        writeStorage(next);
        return { ok: true, state: next };
      }

      if (current.compare.length >= MAX_COMPARE) {
        return {
          ok: false,
          reason: `Compare is limited to ${MAX_COMPARE} products.`,
          state: current,
        };
      }

      const first = current.compare[0];
      if (first && first.categorySlug !== categorySlug) {
        return {
          ok: false,
          reason: "Compare only works with products in the same category.",
          state: current,
        };
      }

      const next = {
        ...current,
        compare: [...current.compare, { slug, categorySlug }],
      };
      writeStorage(next);
      return { ok: true, state: next };
    },
    [],
  );

  const removeCompare = useCallback((slug: string) => {
    const current = readStorage();
    writeStorage({
      ...current,
      compare: current.compare.filter((entry) => entry.slug !== slug),
    });
  }, []);

  const clearCompare = useCallback(() => {
    const current = readStorage();
    writeStorage({ ...current, compare: [] });
  }, []);

  /** Replaces the compare set outright — used when a shared `?items=` link
   *  opens the compare page on someone else's device. */
  const setCompare = useCallback((entries: CompareEntry[]) => {
    const current = readStorage();
    const seen = new Set<string>();
    const next: CompareEntry[] = [];
    for (const entry of entries) {
      if (seen.has(entry.slug) || next.length >= MAX_COMPARE) {
        continue;
      }
      if (next[0] && next[0].categorySlug !== entry.categorySlug) {
        continue;
      }
      seen.add(entry.slug);
      next.push(entry);
    }
    writeStorage({ ...current, compare: next });
  }, []);

  return {
    state,
    toggleWishlist,
    removeWishlist,
    clearWishlist,
    toggleCompare,
    removeCompare,
    clearCompare,
    setCompare,
  };
}
