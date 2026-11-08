export const CART_STORAGE_KEY = "techno-house-cart-v1";
/** Payment method stays device-local — Cart has no paymentMethodId column. */
export const CART_PAYMENT_STORAGE_KEY = "techno-house-cart-payment-v1";
export const MAX_CART_LINES = 24;
export const MAX_LINE_QTY = 10;

/** Display data for a line's chosen variant (AD-388). */
export type CartLineVariant = {
  name: string;
  /** What the line is sold as — shown instead of the product name. */
  title: string;
  /** Effective unit price — the product's discount window applied. */
  priceAmount: number;
  compareAtAmount: number | null;
  imageSrc: string | null;
};

export type CartLine = {
  slug: string;
  quantity: number;
  /** Selected product colour id when the product has colours. */
  colorId: string | null;
  colorName: string | null;
  colorHex: string | null;
  /** Selected variant id when the product has variants. */
  variantId: string | null;
  /** Resolved by the server for persisted carts; `null` for plain lines. */
  variant: CartLineVariant | null;
};

export function cartLineKey(
  line: Pick<CartLine, "slug" | "colorId"> & { variantId?: string | null },
): string {
  const parts = [line.slug];
  if (line.colorId) {
    parts.push(line.colorId);
  }
  if (line.variantId) {
    parts.push(`v:${line.variantId}`);
  }
  return parts.join("::");
}

/** Product page link for a line — opens on the line's variant. */
export function cartLineHref(line: Pick<CartLine, "slug" | "variantId">): string {
  return line.variantId
    ? `/product/${line.slug}?variant=${encodeURIComponent(line.variantId)}`
    : `/product/${line.slug}`;
}

/** What one unit of a cart line costs: its variant's price, else the product's. */
export function cartLineUnitAmount(
  line: Pick<CartLine, "variant">,
  productPriceAmount: number,
): number {
  return line.variant ? line.variant.priceAmount : productPriceAmount;
}

export type CartCouponPreview = {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  label: string;
};

export type CartState = {
  lines: CartLine[];
  /** Normalized coupon code when applied. */
  couponCode: string | null;
  /** Definition used to preview the discount. */
  appliedCoupon: CartCouponPreview | null;
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
  appliedCoupon: null,
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
