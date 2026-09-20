"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addCartItemAction,
  addCartItemsAction,
  applyCartCouponAction,
  clearCartAction,
  removeCartCouponAction,
  removeCartItemAction,
  setCartQuantityAction,
  setCartShippingAction,
} from "@/features/cart/cart-actions";
import { addBuildToCartAction } from "@/features/pc-builder/build-actions";
import type { BuildSelection } from "@/lib/domain/pc-builder";
import { useCartContext } from "@/features/cart/cart-provider";
import {
  CART_STORAGE_KEY,
  EMPTY_CART,
  MAX_CART_LINES,
  cartLineKey,
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

export type CartWriteResult = { ok: true } | { ok: false; reason: string };

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
      line.colorId === b.lines[index]?.colorId &&
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
      const colorIdRaw = (item as CartLine).colorId;
      const colorId =
        typeof colorIdRaw === "string" && colorIdRaw.trim()
          ? colorIdRaw.trim()
          : null;
      const colorNameRaw = (item as CartLine).colorName;
      const colorName =
        typeof colorNameRaw === "string" && colorNameRaw.trim()
          ? colorNameRaw.trim()
          : null;
      const colorHexRaw = (item as CartLine).colorHex;
      const colorHex =
        typeof colorHexRaw === "string" && colorHexRaw.trim()
          ? colorHexRaw.trim()
          : null;
      lines.push({
        slug,
        quantity: clampQuantity((item as CartLine).quantity),
        colorId,
        colorName,
        colorHex,
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

function couponPreviewFromCode(code: string | null) {
  return code ? findMockCoupon(code) : null;
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

  if (findShippingMethod(methodId)?.isPickup) {
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
    const couponCode = normalizeCouponCodeField(parsed.couponCode);
    return {
      lines: normalizeLines(parsed.lines),
      couponCode,
      appliedCoupon: couponPreviewFromCode(couponCode),
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

function withPayment(
  state: CartState,
  paymentMethodId: string | null,
): CartState {
  return { ...state, paymentMethodId };
}

type LocalAddColor = {
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
};

function localAddItem(
  current: CartState,
  slug: string,
  quantity: number,
  color: LocalAddColor = {
    colorId: null,
    colorName: null,
    colorHex: null,
  },
): CartState | { ok: false; reason: string } {
  const qty = clampQuantity(quantity);
  const key = cartLineKey({ slug, colorId: color.colorId });
  const existing = current.lines.find(
    (line) => cartLineKey(line) === key,
  );
  if (existing) {
    return {
      ...current,
      lines: current.lines.map((line) =>
        cartLineKey(line) === key
          ? { ...line, quantity: clampQuantity(line.quantity + qty) }
          : line,
      ),
    };
  }
  if (current.lines.length >= MAX_CART_LINES) {
    return { ok: false, reason: "The cart is full." };
  }
  return {
    ...current,
    lines: [
      ...current.lines,
      {
        slug,
        quantity: qty,
        colorId: color.colorId,
        colorName: color.colorName,
        colorHex: color.colorHex,
      },
    ],
  };
}

export function useCartStore() {
  const ctx = useCartContext();
  const localState = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const persist = ctx.persist;
  const state = persist ? ctx.state : localState;

  const addItem = useCallback(
    async (
      slug: string,
      quantity = 1,
      color: LocalAddColor = {
        colorId: null,
        colorName: null,
        colorHex: null,
      },
      wantsEmi = false,
    ): Promise<CartWriteResult> => {
      if (!persist) {
        const next = localAddItem(readStorage(), slug, quantity, color);
        if ("ok" in next) {
          return next;
        }
        writeStorage(next);
        return { ok: true };
      }

      const previous = ctx.state;
      const optimistic = localAddItem(previous, slug, quantity, color);
      if (!("ok" in optimistic)) {
        ctx.replacePersisted(optimistic);
      }
      const result = await addCartItemAction(
        slug,
        quantity,
        color.colorId,
        wantsEmi,
      );
      if (!result.ok) {
        ctx.replacePersisted(previous);
        return result;
      }
      ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
      return { ok: true };
    },
    [persist, ctx],
  );

  const addItems = useCallback(
    async (slugs: string[]): Promise<CartWriteResult> => {
      if (!persist) {
        let current = readStorage();
        for (const raw of slugs) {
          const slug = raw.trim();
          if (!slug) {
            continue;
          }
          const next = localAddItem(current, slug, 1);
          if ("ok" in next) {
            break;
          }
          current = next;
        }
        writeStorage(current);
        return { ok: true };
      }

      const previous = ctx.state;
      let optimistic = previous;
      for (const raw of slugs) {
        const slug = raw.trim();
        if (!slug) {
          continue;
        }
        const next = localAddItem(optimistic, slug, 1);
        if ("ok" in next) {
          break;
        }
        optimistic = next;
      }
      ctx.replacePersisted(optimistic);
      const result = await addCartItemsAction(slugs);
      if (!result.ok) {
        ctx.replacePersisted(previous);
        return result;
      }
      ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
      return { ok: true };
    },
    [persist, ctx],
  );

  const addBuild = useCallback(
    async (selection: BuildSelection): Promise<CartWriteResult> => {
      const result = await addBuildToCartAction(selection);
      if (!result.ok) {
        return { ok: false, reason: result.reason };
      }
      if (result.persisted && result.state) {
        ctx.replacePersisted(
          withPayment(result.state, ctx.state.paymentMethodId),
        );
        return { ok: true };
      }
      let current = persist ? ctx.state : readStorage();
      for (const raw of result.slugs) {
        const slug = raw.trim();
        if (!slug) {
          continue;
        }
        const next = localAddItem(current, slug, 1);
        if ("ok" in next) {
          return next;
        }
        current = next;
      }
      if (persist) {
        ctx.replacePersisted(current);
      } else {
        writeStorage(current);
      }
      return { ok: true };
    },
    [persist, ctx],
  );

  const setQuantity = useCallback(
    async (
      slug: string,
      quantity: number,
      colorId: string | null = null,
    ): Promise<CartWriteResult> => {
      const qty = clampQuantity(quantity);
      const key = cartLineKey({ slug, colorId });
      if (!persist) {
        const current = readStorage();
        writeStorage({
          ...current,
          lines: current.lines.map((line) =>
            cartLineKey(line) === key ? { ...line, quantity: qty } : line,
          ),
        });
        return { ok: true };
      }

      const previous = ctx.state;
      ctx.replacePersisted({
        ...previous,
        lines: previous.lines.map((line) =>
          cartLineKey(line) === key ? { ...line, quantity: qty } : line,
        ),
      });
      const result = await setCartQuantityAction(slug, quantity, colorId);
      if (!result.ok) {
        ctx.replacePersisted(previous);
        return result;
      }
      ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
      return { ok: true };
    },
    [persist, ctx],
  );

  const removeItem = useCallback(
    async (
      slug: string,
      colorId: string | null = null,
    ): Promise<CartWriteResult> => {
      const key = cartLineKey({ slug, colorId });
      if (!persist) {
        const current = readStorage();
        const lines = current.lines.filter(
          (line) => cartLineKey(line) !== key,
        );
        writeStorage(lines.length === 0 ? EMPTY_CART : { ...current, lines });
        return { ok: true };
      }

      const previous = ctx.state;
      const lines = previous.lines.filter((line) => cartLineKey(line) !== key);
      ctx.replacePersisted(
        lines.length === 0
          ? { ...EMPTY_CART, paymentMethodId: previous.paymentMethodId }
          : { ...previous, lines },
      );
      const result = await removeCartItemAction(slug, colorId);
      if (!result.ok) {
        ctx.replacePersisted(previous);
        return result;
      }
      ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
      return { ok: true };
    },
    [persist, ctx],
  );

  const clearCart = useCallback(async (): Promise<CartWriteResult> => {
    if (!persist) {
      writeStorage(EMPTY_CART);
      return { ok: true };
    }
    const previous = ctx.state;
    ctx.replacePersisted({
      ...EMPTY_CART,
      paymentMethodId: previous.paymentMethodId,
    });
    const result = await clearCartAction();
    if (!result.ok) {
      ctx.replacePersisted(previous);
      return result;
    }
    ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
    return { ok: true };
  }, [persist, ctx]);

  const applyCoupon = useCallback(
    async (rawCode: string): Promise<CouponApplyResult> => {
      if (!persist) {
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
        writeStorage({
          ...current,
          couponCode: coupon.code,
          appliedCoupon: coupon,
        });
        return { ok: true, coupon, discountAmount: 0 };
      }

      const result = await applyCartCouponAction(rawCode);
      if (!result.ok) {
        return result;
      }
      ctx.replacePersisted(
        withPayment(result.state, ctx.state.paymentMethodId),
      );
      const coupon =
        result.state.appliedCoupon ??
        (result.state.couponCode
          ? findMockCoupon(result.state.couponCode)
          : null);
      if (!coupon) {
        return { ok: false, reason: "That coupon code is not recognized." };
      }
      return { ok: true, coupon, discountAmount: 0 };
    },
    [persist, ctx],
  );

  const removeCoupon = useCallback(async (): Promise<CartWriteResult> => {
    if (!persist) {
      const current = readStorage();
      writeStorage({ ...current, couponCode: null, appliedCoupon: null });
      return { ok: true };
    }
    const previous = ctx.state;
    ctx.replacePersisted({
      ...previous,
      couponCode: null,
      appliedCoupon: null,
    });
    const result = await removeCartCouponAction();
    if (!result.ok) {
      ctx.replacePersisted(previous);
      return result;
    }
    ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
    return { ok: true };
  }, [persist, ctx]);

  const setShipping = useCallback(
    async ({
      methodId,
      areaId,
    }: {
      methodId: string | null;
      areaId: string | null;
    }): Promise<CartWriteResult> => {
      const shipping = normalizeShipping(methodId, areaId);
      if (!persist) {
        const current = readStorage();
        writeStorage({ ...current, ...shipping });
        return { ok: true };
      }
      const previous = ctx.state;
      ctx.replacePersisted({ ...previous, ...shipping });
      const result = await setCartShippingAction({ methodId, areaId });
      if (!result.ok) {
        ctx.replacePersisted(previous);
        return result;
      }
      ctx.replacePersisted(withPayment(result.state, previous.paymentMethodId));
      return { ok: true };
    },
    [persist, ctx],
  );

  const setPaymentMethod = useCallback(
    (methodId: string | null) => {
      if (!persist) {
        const current = readStorage();
        writeStorage({
          ...current,
          paymentMethodId: normalizePaymentMethodId(methodId),
        });
        return;
      }
      ctx.setPaymentMethodId(normalizePaymentMethodId(methodId));
    },
    [persist, ctx],
  );

  return {
    state,
    persist,
    addItem,
    addItems,
    addBuild,
    setQuantity,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    setShipping,
    setPaymentMethod,
  };
}
