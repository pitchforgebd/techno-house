"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  CART_STORAGE_KEY,
  EMPTY_CART,
  MAX_CART_LINES,
  clampQuantity,
  type CartLine,
  type CartState,
} from "@/lib/cart/cart";
import {
  findMockCoupon,
  normalizeCouponCode,
  type CouponApplyResult,
} from "@/lib/cart/coupons";
import {
  findShippingArea,
  findShippingMethod,
  resolveShippingRate,
} from "@/lib/cart/shipping";
import { findPaymentMethod } from "@/lib/cart/payment";

type Listener = () => void;

const listeners = new Set<Listener>();
let cached: CartState = EMPTY_CART;

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function sameCart(a: CartState, b: CartState): boolean {
  if (a === b) {
    return true;
  }
  if (
    a.couponCode !== b.couponCode ||
    a.shippingMethodId !== b.shippingMethodId ||
    a.shippingAreaId !== b.shippingAreaId ||
    a.paymentMethodId !== b.paymentMethodId ||
    a.lines.length !== b.lines.length
  ) {
    return false;
  }
  return a.lines.every(
    (line, index) =>
      line.slug === b.lines[index]?.slug &&
      line.quantity === b.lines[index]?.quantity,
  );
}

function normalizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const lines: CartLine[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as CartLine).slug === "string" &&
      typeof (item as CartLine).quantity === "number"
    ) {
      const slug = (item as CartLine).slug.trim();
      if (!slug) {
        continue;
      }
      lines.push({
        slug,
        quantity: clampQuantity((item as CartLine).quantity),
      });
    }
  }
  return lines.slice(0, MAX_CART_LINES);
}

function normalizeCouponCodeField(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const code = normalizeCouponCode(raw);
  return code && findMockCoupon(code) ? code : null;
}

function normalizeShipping(
  methodRaw: unknown,
  areaRaw: unknown,
): Pick<CartState, "shippingMethodId" | "shippingAreaId"> {
  const methodId =
    typeof methodRaw === "string" && findShippingMethod(methodRaw)
      ? methodRaw
      : null;
  const areaId =
    typeof areaRaw === "string" && findShippingArea(areaRaw) ? areaRaw : null;

  if (!methodId) {
    return { shippingMethodId: null, shippingAreaId: null };
  }

  if (methodId === "store_pickup") {
    return {
      shippingMethodId: methodId,
      shippingAreaId: areaId,
    };
  }

  const resolved = resolveShippingRate(methodId, areaId);
  if (!resolved.ok) {
    return { shippingMethodId: methodId, shippingAreaId: areaId };
  }

  return {
    shippingMethodId: methodId,
    shippingAreaId: areaId,
  };
}

function normalizePaymentMethodId(raw: unknown): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  return findPaymentMethod(raw)?.id ?? null;
}

function readStorage(): CartState {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) {
      return EMPTY_CART;
    }
    const parsed = JSON.parse(raw) as Partial<CartState>;
    const shipping = normalizeShipping(
      parsed.shippingMethodId,
      parsed.shippingAreaId,
    );
    return {
      lines: normalizeLines(parsed.lines),
      couponCode: normalizeCouponCodeField(parsed.couponCode),
      ...shipping,
      paymentMethodId: normalizePaymentMethodId(parsed.paymentMethodId),
    };
  } catch {
    return EMPTY_CART;
  }
}

function writeStorage(state: CartState) {
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  cached = state;
  emit();
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): CartState {
  const next = readStorage();
  if (sameCart(cached, next)) {
    return cached;
  }
  cached = next;
  return cached;
}

function getServerSnapshot(): CartState {
  return EMPTY_CART;
}

export function useCartStore() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addItem = useCallback((slug: string, quantity = 1) => {
    const current = readStorage();
    const qty = clampQuantity(quantity);
    const existing = current.lines.find((line) => line.slug === slug);
    if (existing) {
      writeStorage({
        ...current,
        lines: current.lines.map((line) =>
          line.slug === slug
            ? { ...line, quantity: clampQuantity(line.quantity + qty) }
            : line,
        ),
      });
      return;
    }
    if (current.lines.length >= MAX_CART_LINES) {
      return;
    }
    writeStorage({
      ...current,
      lines: [...current.lines, { slug, quantity: qty }],
    });
  }, []);

  /** Adds multiple unique slugs (qty 1 each). Skips when cart line cap is hit. */
  const addItems = useCallback((slugs: string[]) => {
    let current = readStorage();
    for (const raw of slugs) {
      const slug = raw.trim();
      if (!slug) {
        continue;
      }
      const existing = current.lines.find((line) => line.slug === slug);
      if (existing) {
        current = {
          ...current,
          lines: current.lines.map((line) =>
            line.slug === slug
              ? { ...line, quantity: clampQuantity(line.quantity + 1) }
              : line,
          ),
        };
        continue;
      }
      if (current.lines.length >= MAX_CART_LINES) {
        break;
      }
      current = {
        ...current,
        lines: [...current.lines, { slug, quantity: 1 }],
      };
    }
    writeStorage(current);
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    const current = readStorage();
    const qty = clampQuantity(quantity);
    writeStorage({
      ...current,
      lines: current.lines.map((line) =>
        line.slug === slug ? { ...line, quantity: qty } : line,
      ),
    });
  }, []);

  const removeItem = useCallback((slug: string) => {
    const current = readStorage();
    const lines = current.lines.filter((line) => line.slug !== slug);
    if (lines.length === 0) {
      writeStorage(EMPTY_CART);
      return;
    }
    writeStorage({
      ...current,
      lines,
    });
  }, []);

  const clearCart = useCallback(() => {
    writeStorage(EMPTY_CART);
  }, []);

  const applyCoupon = useCallback((rawCode: string): CouponApplyResult => {
    const current = readStorage();
    const code = normalizeCouponCode(rawCode);
    if (!code) {
      return { ok: false, reason: "Enter a coupon code." };
    }
    const coupon = findMockCoupon(code);
    if (!coupon) {
      return { ok: false, reason: "That coupon code is not recognized." };
    }
    if (current.lines.length === 0) {
      return { ok: false, reason: "Add items before applying a coupon." };
    }
    writeStorage({ ...current, couponCode: coupon.code });
    return {
      ok: true,
      coupon,
      discountAmount: 0,
    };
  }, []);

  const removeCoupon = useCallback(() => {
    const current = readStorage();
    writeStorage({ ...current, couponCode: null });
  }, []);

  const setShipping = useCallback(
    ({
      methodId,
      areaId,
    }: {
      methodId: string | null;
      areaId: string | null;
    }) => {
      const current = readStorage();
      const shipping = normalizeShipping(methodId, areaId);
      writeStorage({ ...current, ...shipping });
    },
    [],
  );

  const setPaymentMethod = useCallback((methodId: string | null) => {
    const current = readStorage();
    writeStorage({
      ...current,
      paymentMethodId: normalizePaymentMethodId(methodId),
    });
  }, []);

  return {
    state,
    addItem,
    addItems,
    setQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    setShipping,
    setPaymentMethod,
  };
}
