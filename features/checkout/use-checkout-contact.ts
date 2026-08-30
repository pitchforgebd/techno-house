"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  CHECKOUT_CONTACT_KEY,
  EMPTY_CHECKOUT_CONTACT,
  type CheckoutContact,
} from "@/lib/cart/checkout";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: CheckoutContact = EMPTY_CHECKOUT_CONTACT;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function sameContact(a: CheckoutContact, b: CheckoutContact): boolean {
  return (
    a.fullName === b.fullName &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.addressLine === b.addressLine &&
    a.notes === b.notes
  );
}

function readStorage(): CheckoutContact {
  if (typeof window === "undefined") {
    return EMPTY_CHECKOUT_CONTACT;
  }
  try {
    const raw = window.localStorage.getItem(CHECKOUT_CONTACT_KEY);
    if (!raw) {
      return EMPTY_CHECKOUT_CONTACT;
    }
    const parsed = JSON.parse(raw) as Partial<CheckoutContact>;
    return {
      fullName:
        typeof parsed.fullName === "string"
          ? parsed.fullName.slice(0, 120)
          : "",
      phone: typeof parsed.phone === "string" ? parsed.phone.slice(0, 32) : "",
      email: typeof parsed.email === "string" ? parsed.email.slice(0, 160) : "",
      addressLine:
        typeof parsed.addressLine === "string"
          ? parsed.addressLine.slice(0, 240)
          : "",
      notes: typeof parsed.notes === "string" ? parsed.notes.slice(0, 400) : "",
    };
  } catch {
    return EMPTY_CHECKOUT_CONTACT;
  }
}

function writeStorage(contact: CheckoutContact) {
  window.localStorage.setItem(CHECKOUT_CONTACT_KEY, JSON.stringify(contact));
  cached = contact;
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CheckoutContact {
  const next = readStorage();
  if (sameContact(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): CheckoutContact {
  return EMPTY_CHECKOUT_CONTACT;
}

export function useCheckoutContact() {
  const contact = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const setContact = useCallback((next: CheckoutContact) => {
    writeStorage(next);
  }, []);

  const patchContact = useCallback((patch: Partial<CheckoutContact>) => {
    writeStorage({ ...readStorage(), ...patch });
  }, []);

  const clearContact = useCallback(() => {
    writeStorage(EMPTY_CHECKOUT_CONTACT);
  }, []);

  return { contact, setContact, patchContact, clearContact };
}
