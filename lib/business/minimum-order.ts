/**
 * Minimum order value (F17-01, remainder).
 *
 * `StoreOperationsSettings.minimumOrderAmount` is in the same persist-only
 * group as the VAT rate and the service charge: it validated, saved and
 * reloaded, and no checkout ever consulted it. A store that set a 500 BDT
 * minimum still accepted 50 BDT orders.
 *
 * ## Which number the minimum is measured against, and why it matters
 *
 * It is measured against the **goods subtotal before any coupon discount**,
 * and this is a real choice rather than an obvious one:
 *
 * - *Before* discount is the number the customer sees on the cart screen. They
 *   are told "minimum order 500", their cart says 600, and the order is
 *   accepted. Predictable.
 * - *After* discount is the number the store actually collects, which is the
 *   economically meaningful figure — but it means a valid coupon can push a
 *   qualifying cart below the line and reject it at the final step, after the
 *   customer has entered an address and chosen a payment method. That is a
 *   confusing failure at the worst possible moment.
 *
 * Shipping is excluded on the same reasoning: a minimum ORDER value is about
 * the goods, and including delivery would let a distant customer qualify with
 * a smaller basket than a nearby one.
 *
 * If this store needs the post-discount rule instead, this function is the one
 * line to change — that is why the comparison lives here rather than inline at
 * the call site.
 */
import { formatMoney } from "@/lib/format/currency";

export type MinimumOrderCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Returns a refusal when the basket is under the configured minimum.
 *
 * A zero, negative or non-integer minimum is treated as "no minimum", so the
 * default configuration reproduces the previous behaviour exactly.
 */
export function belowMinimumOrder(input: {
  /** Goods value before discount, in minor units. */
  subtotalAmount: number;
  /** `StoreOperationsSettings.minimumOrderAmount`. */
  minimumOrderAmount: number;
}): MinimumOrderCheck {
  const minimum = input.minimumOrderAmount;
  if (!Number.isInteger(minimum) || minimum <= 0) {
    return { ok: true };
  }
  if (input.subtotalAmount >= minimum) {
    return { ok: true };
  }
  // The message names the figure. "Your order is too small" sends the customer
  // back to the cart to guess how much more to add.
  return {
    ok: false,
    reason: `Orders start at ${formatMoney({ amount: minimum })}. Please add a little more to your cart before checking out.`,
  };
}
