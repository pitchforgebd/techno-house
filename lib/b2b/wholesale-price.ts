import type { Money } from "@/lib/data";

/** Demo wholesale discount — not authoritative until B2B backend exists. */
const WHOLESALE_DISCOUNT_RATE = 0.12;

export function wholesalePriceFromRetail(price: Money): Money {
  const discounted = Math.round(price.amount * (1 - WHOLESALE_DISCOUNT_RATE));
  return { amount: Math.max(0, discounted), currency: price.currency };
}
