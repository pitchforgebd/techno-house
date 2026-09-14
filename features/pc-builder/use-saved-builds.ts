"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import {
  createShareLinkAction,
  deleteSavedBuildAction,
  listSavedBuildsAction,
  saveSavedBuildAction,
  shareSavedBuildAction,
} from "@/features/pc-builder/build-actions";
import {
  BUILDER_SAVED_STORAGE_KEY,
  addSavedBuild,
  normalizeSavedBuilds,
  removeSavedBuild,
  type BuildSelection,
  type SavedBuild,
} from "@/lib/domain/pc-builder";

type Listener = () => void;

type AccountCache = {
  userId: string;
  builds: SavedBuild[];
  persisted: boolean;
};

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
  const session = useCustomerSession();
  const userId = session?.userId ?? null;
  const localBuilds = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [account, setAccount] = useState<AccountCache | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    void listSavedBuildsAction().then((result) => {
      if (cancelled) {
        return;
      }
      if (result.ok && result.persisted) {
        setAccount({
          userId,
          builds: result.builds,
          persisted: true,
        });
        return;
      }
      setAccount({ userId, builds: [], persisted: false });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const accountReady = !userId || account?.userId === userId;
  const useAccount = Boolean(
    userId && accountReady && account?.persisted && account.userId === userId,
  );
  const builds = !userId
    ? localBuilds
    : !accountReady
      ? EMPTY_SAVED
      : useAccount
        ? (account?.builds ?? EMPTY_SAVED)
        : localBuilds;

  const saveBuild = useCallback(
    async (name: string, selection: BuildSelection) => {
      setError(null);
      if (!userId) {
        writeStorage(addSavedBuild(getSnapshot(), name, selection));
        return { ok: true as const };
      }
      setPending(true);
      const result = await saveSavedBuildAction({ name, selection });
      setPending(false);
      if (result.ok && result.persisted) {
        setAccount({ userId, builds: result.builds, persisted: true });
        return { ok: true as const };
      }
      if (!result.ok && !result.persisted) {
        writeStorage(addSavedBuild(getSnapshot(), name, selection));
        return { ok: true as const };
      }
      if (!result.ok) {
        setError(result.formError);
        return { ok: false as const, formError: result.formError };
      }
      return { ok: true as const };
    },
    [userId],
  );

  const shareCurrent = useCallback(
    async (selection: BuildSelection) => {
      setError(null);
      if (!useAccount || !userId) {
        return { ok: false as const, persisted: false };
      }
      setPending(true);
      const result = await createShareLinkAction({ selection });
      setPending(false);
      if (result.ok && result.persisted) {
        setAccount({ userId, builds: result.builds, persisted: true });
        return {
          ok: true as const,
          sharePath: result.sharePath,
          persisted: true,
        };
      }
      if (!result.ok) {
        setError(result.formError);
        return {
          ok: false as const,
          formError: result.formError,
          persisted: result.persisted,
        };
      }
      return { ok: false as const, persisted: result.persisted };
    },
    [useAccount, userId],
  );

  const shareSaved = useCallback(
    async (id: string) => {
      setError(null);
      if (!useAccount || !userId) {
        return { ok: false as const, persisted: false };
      }
      setPending(true);
      const result = await shareSavedBuildAction(id);
      setPending(false);
      if (result.ok && result.persisted) {
        setAccount({ userId, builds: result.builds, persisted: true });
        return {
          ok: true as const,
          sharePath: result.sharePath,
          persisted: true,
        };
      }
      if (!result.ok) {
        setError(result.formError);
        return {
          ok: false as const,
          formError: result.formError,
          persisted: result.persisted,
        };
      }
      return { ok: false as const, persisted: result.persisted };
    },
    [useAccount, userId],
  );

  const deleteBuild = useCallback(
    async (id: string) => {
      setError(null);
      if (!useAccount) {
        writeStorage(removeSavedBuild(getSnapshot(), id));
        return;
      }
      setPending(true);
      const result = await deleteSavedBuildAction(id);
      setPending(false);
      if (result.ok && result.persisted && userId) {
        setAccount({ userId, builds: result.builds, persisted: true });
        return;
      }
      if (!result.ok) {
        setError(result.formError);
      }
    },
    [useAccount, userId],
  );

  return {
    builds,
    saveBuild,
    shareCurrent,
    shareSaved,
    deleteBuild,
    pending,
    ready: accountReady,
    persisted: useAccount,
    error,
  };
}
