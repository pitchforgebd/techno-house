"use server";

import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  addCartItem,
  addCartItems,
  applyPersistedCoupon,
  clearPersistedCart,
  removeCartItem,
  removePersistedCoupon,
  setCartQuantity,
  setPersistedShipping,
  type CartMutationResult,
} from "@/lib/cart/persist";

function originBlocked(): CartMutationResult {
  return { ok: false, reason: CROSS_ORIGIN_ERROR };
}

export type { CartMutationResult };

export async function addCartItemAction(
  slug: string,
  quantity = 1,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return addCartItem(slug, quantity, colorId);
}

export async function addCartItemsAction(
  slugs: string[],
): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return addCartItems(slugs);
}

export async function setCartQuantityAction(
  slug: string,
  quantity: number,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return setCartQuantity(slug, quantity, colorId);
}

export async function removeCartItemAction(
  slug: string,
  colorId: string | null = null,
): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return removeCartItem(slug, colorId);
}

export async function clearCartAction(): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return clearPersistedCart();
}

export async function applyCartCouponAction(
  rawCode: string,
): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return applyPersistedCoupon(rawCode);
}

export async function removeCartCouponAction(): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return removePersistedCoupon();
}

export async function setCartShippingAction(input: {
  methodId: string | null;
  areaId: string | null;
}): Promise<CartMutationResult> {
  if (!(await isSameOriginRequest())) {
    return originBlocked();
  }
  return setPersistedShipping(input);
}
