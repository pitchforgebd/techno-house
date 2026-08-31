"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  B2B_ACCOUNTS_STORAGE_KEY,
  B2B_SESSION_STORAGE_KEY,
  createB2BSession,
  parseB2BAccounts,
  parseB2BSession,
  type B2BAccount,
  type B2BSession,
} from "@/lib/b2b/mock-session";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: B2BSession | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function readSession(): B2BSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(B2B_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseB2BSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readAccounts(): B2BAccount[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(B2B_ACCOUNTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return parseB2BAccounts(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeSession(session: B2BSession | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (session) {
    window.localStorage.setItem(B2B_SESSION_STORAGE_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(B2B_SESSION_STORAGE_KEY);
  }
  cached = session;
  emit();
}

function writeAccounts(accounts: B2BAccount[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(
    B2B_ACCOUNTS_STORAGE_KEY,
    JSON.stringify(accounts),
  );
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  if (cached === null && typeof window !== "undefined") {
    cached = readSession();
  }
  return cached;
}

function getServerSnapshot() {
  return null;
}

export function useB2BSession() {
  const session = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const register = useCallback((account: B2BAccount) => {
    const accounts = readAccounts();
    if (accounts.some((item) => item.email === account.email)) {
      return { ok: false as const, reason: "An account with this email exists." };
    }
    writeAccounts([...accounts, account]);
    writeSession(createB2BSession(account));
    return { ok: true as const };
  }, []);

  const signIn = useCallback((email: string, password: string) => {
    const account = readAccounts().find(
      (item) => item.email === email && item.password === password,
    );
    if (!account) {
      return { ok: false as const, reason: "Email or password is incorrect." };
    }
    writeSession(createB2BSession(account));
    return { ok: true as const };
  }, []);

  const signOut = useCallback(() => {
    writeSession(null);
  }, []);

  return { session, register, signIn, signOut };
}
