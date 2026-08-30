"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { BuilderSlot } from "@/lib/data";
import {
  BUILDER_STORAGE_KEY,
  clearSlotSelection,
  emptyBuildSelection,
  normalizeBuildSelection,
  setSlotSelection,
  type BuildSelection,
} from "@/lib/domain/pc-builder";

type Listener = () => void;

const listeners = new Set<Listener>();
const EMPTY_SELECTION: BuildSelection = emptyBuildSelection();
let cached: BuildSelection = EMPTY_SELECTION;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function sameSelection(a: BuildSelection, b: BuildSelection): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key as BuilderSlot] !== b[key as BuilderSlot]) {
      return false;
    }
  }
  return true;
}

function readStorage(): BuildSelection {
  if (typeof window === "undefined") {
    return EMPTY_SELECTION;
  }
  try {
    const raw = window.localStorage.getItem(BUILDER_STORAGE_KEY);
    if (!raw) {
      return EMPTY_SELECTION;
    }
    return normalizeBuildSelection(JSON.parse(raw));
  } catch {
    return EMPTY_SELECTION;
  }
}

function writeStorage(selection: BuildSelection) {
  cached = selection;
  try {
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // Ignore quota / private mode failures; in-memory cache still updates.
  }
  emit();
}

function getSnapshot(): BuildSelection {
  const next = readStorage();
  if (!sameSelection(cached, next)) {
    cached = next;
  }
  return cached;
}

function getServerSnapshot(): BuildSelection {
  return EMPTY_SELECTION;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useBuilderStore() {
  const selection = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const selectPart = useCallback((slotId: BuilderSlot, slug: string) => {
    writeStorage(setSlotSelection(getSnapshot(), slotId, slug));
  }, []);

  const clearPart = useCallback((slotId: BuilderSlot) => {
    writeStorage(clearSlotSelection(getSnapshot(), slotId));
  }, []);

  const clearBuild = useCallback(() => {
    writeStorage(emptyBuildSelection());
  }, []);

  const loadSelection = useCallback((next: BuildSelection) => {
    writeStorage(normalizeBuildSelection(next));
  }, []);

  return { selection, selectPart, clearPart, clearBuild, loadSelection };
}
