"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  MOCK_CUSTOMER_STORAGE_KEY,
  parseMockCustomerSession,
  type MockCustomerSession,
} from "@/lib/account/mock-session";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: MockCustomerSession | null = null;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function sameSession(
  a: MockCustomerSession | null,
  b: MockCustomerSession | null,
): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.kind === b.kind &&
    a.email === b.email &&
    a.fullName === b.fullName &&
    a.phone === b.phone
  );
}

function readStorage(): MockCustomerSession | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(MOCK_CUSTOMER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseMockCustomerSession(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeStorage(session: MockCustomerSession | null) {
  cached = session;
  try {
    if (session) {
      window.localStorage.setItem(
        MOCK_CUSTOMER_STORAGE_KEY,
        JSON.stringify(session),
      );
    } else {
      window.localStorage.removeItem(MOCK_CUSTOMER_STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private mode failures.
  }
  emit();
}

function getSnapshot(): MockCustomerSession | null {
  const next = readStorage();
  if (sameSession(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): MockCustomerSession | null {
  return null;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMockCustomer() {
  const session = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const signInMock = useCallback((next: MockCustomerSession) => {
    writeStorage(next);
  }, []);

  const signOutMock = useCallback(() => {
    writeStorage(null);
  }, []);

  return { session, signInMock, signOutMock };
}
