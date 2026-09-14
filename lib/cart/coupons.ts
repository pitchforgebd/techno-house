/** Display-only mock coupons. Not authoritative for charges. */

export type CouponKind = "percent" | "fixed";

export type CouponDefinition = {
  code: string;
  kind: CouponKind;
  /** Percent 1–100, or fixed taka amount. */
  value: number;
  label: string;
};

export const MOCK_COUPONS: CouponDefinition[] = [
  {
    code: "SAVE10",
    kind: "percent",
    value: 10,
    label: "10% off (display only)",
  },
  {
    code: "WELCOME500",
    kind: "fixed",
    value: 500,
    label: "৳ 500 off (display only)",
  },
];

export const MAX_COUPON_CODE_LENGTH = 32;

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().slice(0, MAX_COUPON_CODE_LENGTH);
}

export function findMockCoupon(code: string): CouponDefinition | null {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return null;
  }
  return MOCK_COUPONS.find((coupon) => coupon.code === normalized) ?? null;
}

export type CouponApplyResult =
  | { ok: true; coupon: CouponDefinition; discountAmount: number }
  | { ok: false; reason: string };

/** Discount against a subtotal in integer taka. Pass a definition from persist. */
export function applyCouponToSubtotal(
  code: string | null,
  subtotal: number,
  definition?: CouponDefinition | null,
): CouponApplyResult {
  if (!code) {
    return { ok: false, reason: "Enter a coupon code." };
  }
  const coupon = definition ?? findMockCoupon(code);
  if (!coupon) {
    return { ok: false, reason: "That coupon code is not recognized." };
  }
  if (!Number.isFinite(subtotal) || subtotal <= 0) {
    return { ok: false, reason: "Add items before applying a coupon." };
  }

  let discountAmount = 0;
  if (coupon.kind === "percent") {
    discountAmount = Math.floor((subtotal * coupon.value) / 100);
  } else {
    discountAmount = coupon.value;
  }
  discountAmount = Math.min(discountAmount, subtotal);

  return { ok: true, coupon, discountAmount };
}
