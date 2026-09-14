/**
 * Client-safe wholesale price math (AD-257). Pure functions — no server
 * imports — so they can be used directly from "use client" components.
 */
import type { Money } from "@/lib/data/types/common";

export function computeWholesalePrice(retail: Money, discountPercent: number): Money {
  const clamped = Math.max(0, Math.min(100, discountPercent));
  const amount = Math.round(retail.amount * (1 - clamped / 100));
  return { amount, currency: retail.currency };
}

/** Per-product wholesale override, when the admin has set one. */
export type B2BProductTerms = {
  priceAmount: number;
  minQuantity: number;
};

export type B2BPricing = {
  price: Money;
  minQuantity: number;
  /** True when the price came from a per-product row rather than the flat %. */
  fromProductTerms: boolean;
};

/**
 * Resolves what a verified B2B buyer pays for one product.
 *
 * A per-product row wins outright — it is the negotiated price, so it must not
 * be re-discounted by the account percentage on top. Products with no row fall
 * back to that percentage, which is why adding a product to the catalogue never
 * leaves a wholesale buyer without a price.
 */
export function resolveB2BPricing(input: {
  retail: Money;
  discountPercent: number;
  terms?: B2BProductTerms | null;
}): B2BPricing {
  const { retail, discountPercent, terms } = input;
  if (terms) {
    return {
      price: {
        amount: Math.max(0, Math.round(terms.priceAmount)),
        currency: retail.currency,
      },
      minQuantity: Math.max(1, Math.round(terms.minQuantity)),
      fromProductTerms: true,
    };
  }
  return {
    price: computeWholesalePrice(retail, discountPercent),
    minQuantity: 1,
    fromProductTerms: false,
  };
}
