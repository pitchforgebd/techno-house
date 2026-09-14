/**
 * Order VAT calculation (F17-01).
 *
 * Admin → Settings has had a VAT rate field since the settings screens were
 * built. It validated, saved and reloaded correctly — and nothing read it.
 * `lib/orders/create-order.ts` hard-coded `const taxAmount = 0`, so a rate
 * entered by the operator had no effect on any order total. The screen looked
 * authoritative and was not.
 *
 * This is the missing calculation. It is deliberately pure — no database, no
 * request scope — so the arithmetic can be tested directly, and so the caller
 * decides when to read the settings (which matters: reading them from inside
 * the order transaction would take a second connection from a `max: 5` pool
 * while holding the first, the same shape that deadlocked the wallet path).
 *
 * ## Two modes, and why the distinction matters
 *
 * `taxIncludedInPrice` is the default and the usual arrangement for a
 * Bangladeshi retail storefront: the price a customer sees already contains
 * VAT. In that mode the tax is *extracted* from the subtotal for the invoice
 * and must NOT be added again, or every order is overcharged by the rate.
 *
 * With it off, VAT is added on top of the goods value.
 *
 * ## What is taxed
 *
 * The discounted goods value — subtotal minus discount. Shipping is excluded.
 * That is the common arrangement, but it IS a jurisdiction question rather
 * than a fact, so it is stated here rather than buried: if this store must
 * charge VAT on delivery too, this is the line to change.
 */

const BASIS_POINTS_PER_UNIT = 10_000;

export type OrderTaxInput = {
  /** Goods value after discount, in minor units. Never negative. */
  taxableBase: number;
  /** VAT rate in basis points — 500 is 5%. */
  vatRateBasisPoints: number;
  /** True when displayed prices already contain the VAT. */
  taxIncludedInPrice: boolean;
};

export type OrderTaxResult = {
  /** VAT for this order, recorded on `Order.taxAmount`. */
  taxAmount: number;
  /**
   * What to add to the order total.
   *
   * Zero in inclusive mode — the tax is already inside the subtotal, and this
   * being separate from `taxAmount` is what stops it being double-counted.
   */
  addedToTotal: number;
};

/**
 * VAT for one order.
 *
 * Rounds to whole minor units. Returns zeroes for a zero or invalid rate, so
 * the default configuration reproduces the previous behaviour exactly.
 */
export function computeOrderTax(input: OrderTaxInput): OrderTaxResult {
  const base = Math.max(0, Math.round(input.taxableBase));
  const rate = input.vatRateBasisPoints;

  if (
    base === 0 ||
    !Number.isFinite(rate) ||
    !Number.isInteger(rate) ||
    rate <= 0
  ) {
    return { taxAmount: 0, addedToTotal: 0 };
  }

  if (input.taxIncludedInPrice) {
    // The base already contains the tax, so the tax is the fraction of it that
    // the rate represents: base − base / (1 + r). Arranged to divide once.
    const taxAmount = Math.round(
      (base * rate) / (BASIS_POINTS_PER_UNIT + rate),
    );
    return { taxAmount, addedToTotal: 0 };
  }

  const taxAmount = Math.round((base * rate) / BASIS_POINTS_PER_UNIT);
  return { taxAmount, addedToTotal: taxAmount };
}
