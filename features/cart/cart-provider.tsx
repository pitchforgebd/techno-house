"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  CART_PAYMENT_STORAGE_KEY,
  EMPTY_CART,
  type CartState,
} from "@/lib/cart/cart";
import { findPaymentMethod } from "@/lib/cart/payment";

type CartContextValue = {
  persist: boolean;
  state: CartState;
  replacePersisted: (next: CartState) => void;
  setPaymentMethodId: (id: string | null) => void;
};

const CartContext = createContext<CartContextValue>({
  persist: false,
  state: EMPTY_CART,
  replacePersisted: () => {},
  setPaymentMethodId: () => {},
});

const paymentListeners = new Set<() => void>();

function emitPayment() {
  for (const listener of paymentListeners) {
    listener();
  }
}

function readPaymentStorage(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CART_PAYMENT_STORAGE_KEY);
    return raw ? (findPaymentMethod(raw)?.id ?? null) : null;
  } catch {
    return null;
  }
}

function writePaymentStorage(id: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (id) {
      window.localStorage.setItem(CART_PAYMENT_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(CART_PAYMENT_STORAGE_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
  emitPayment();
}

function subscribePayment(listener: () => void) {
  paymentListeners.add(listener);
  if (typeof window !== "undefined") {
    window.addEventListener("storage", listener);
  }
  return () => {
    paymentListeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", listener);
    }
  };
}

export function CartProvider({
  persist,
  initial,
  children,
}: {
  persist: boolean;
  initial: CartState;
  children: ReactNode;
}) {
  const [serverCart, setServerCart] = useState<CartState>(initial);
  const paymentMethodId = useSyncExternalStore(
    subscribePayment,
    readPaymentStorage,
    () => null,
  );

  const replacePersisted = useCallback((next: CartState) => {
    setServerCart({ ...next, paymentMethodId: null });
  }, []);

  const setPaymentMethodId = useCallback((id: string | null) => {
    const normalized = id ? (findPaymentMethod(id)?.id ?? null) : null;
    writePaymentStorage(normalized);
  }, []);

  const value = useMemo(() => {
    const state: CartState = persist
      ? { ...serverCart, paymentMethodId }
      : EMPTY_CART;
    return {
      persist,
      state,
      replacePersisted,
      setPaymentMethodId,
    };
  }, [
    persist,
    serverCart,
    paymentMethodId,
    replacePersisted,
    setPaymentMethodId,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext(): CartContextValue {
  return useContext(CartContext);
}
