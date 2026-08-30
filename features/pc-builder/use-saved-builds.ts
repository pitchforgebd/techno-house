"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  BUILDER_SAVED_STORAGE_KEY,
  addSavedBuild,
  normalizeSavedBuilds,
  removeSavedBuild,
  type BuildSelection,
  type SavedBuild,
} from "@/lib/domain/pc-builder";

type Listener = () => void;

const EMPTY_SAVED: SavedBuild[] = [];
const listeners = new Set<Listener>();
let cached: SavedBuild[] = EMPTY_SAVED;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function sameBuilds(a: SavedBuild[], b: SavedBuild[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }
  return a.every((build, index) => build.id === b[index]?.id);
}

function readStorage(): SavedBuild[] {
  if (typeof window === "undefined") {
    return EMPTY_SAVED;
  }
  try {
    const raw = window.localStorage.getItem(BUILDER_SAVED_STORAGE_KEY);
    if (!raw) {
      return EMPTY_SAVED;
    }
    return normalizeSavedBuilds(JSON.parse(raw));
  } catch {
    return EMPTY_SAVED;
  }
}

function writeStorage(builds: SavedBuild[]) {
  cached = builds;
  try {
    window.localStorage.setItem(
      BUILDER_SAVED_STORAGE_KEY,
      JSON.stringify(builds),
    );
  } catch {
    // Ignore quota / private mode failures.
  }
  emit();
}

function getSnapshot(): SavedBuild[] {
  const next = readStorage();
  if (!sameBuilds(cached, next)) {
    cached = next;
  }
  return cached;
}

function getServerSnapshot(): SavedBuild[] {
  return EMPTY_SAVED;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSavedBuilds() {
  const builds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const saveBuild = useCallback((name: string, selection: BuildSelection) => {
    writeStorage(addSavedBuild(getSnapshot(), name, selection));
  }, []);

  const deleteBuild = useCallback((id: string) => {
    writeStorage(removeSavedBuild(getSnapshot(), id));
  }, []);

  return { builds, saveBuild, deleteBuild };
}
