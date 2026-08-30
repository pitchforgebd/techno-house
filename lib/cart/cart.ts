export const CART_STORAGE_KEY = "techno-house-cart-v1";
export const MAX_CART_LINES = 24;
export const MAX_LINE_QTY = 10;

export type CartLine = {
  slug: string;
  quantity: number;
};

export type CartState = {
  lines: CartLine[];
  /** Normalized coupon code when applied; display-only. */
  couponCode: string | null;
  /** Selected shipping method id; display-only. */
  shippingMethodId: string | null;
  /** Selected shipping area id; not required for store pickup. */
  shippingAreaId: string | null;
  /** Selected payment method id; mock UI only — never charges. */
  paymentMethodId: string | null;
};

export const EMPTY_CART: CartState = {
  lines: [],
  couponCode: null,
  shippingMethodId: null,
  shippingAreaId: null,
  paymentMethodId: null,
};

export function cartItemCount(state: CartState): number {
  return state.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function clampQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) {
    return 1;
  }
  return Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(quantity)));
}
