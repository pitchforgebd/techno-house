/**
 * Flat per-order service charge (F17-01, remainder).
 *
 * `StoreOperationsSettings.serviceChargeAmount` sits in the same admin section
 * as the VAT rate and had the same problem: it validated, saved and reloaded,
 * and no order ever carried it. VAT was wired first because it has the larger
 * financial consequence; this is the other half of that section.
 *
 * Pure, for the same two reasons `computeOrderTax` is: the arithmetic can be
 * tested without a database, and the caller decides when to read the settings —
 * reading them from inside the order transaction would take a second connection
 * from a `max: 5` pool while holding the first, the shape that deadlocked the
 * wallet path (AD-321).
 *
 * ## What it is not
 *
 * It is not tax and it is not shipping. It gets its own `Order` column rather
 * than being folded into `taxAmount` or `shippingAmount`, because both of those
 * mean something specific on an invoice and in a VAT return, and quietly
 * inflating either would make the ledger lie. A number that is easy to add in
 * the wrong place is exactly the number to keep separate.
 *
 * ## What it is not taxed on
 *
 * The charge is added after VAT and is NOT part of the taxable base, matching
 * the treatment of shipping in `lib/business/tax.ts`. That is the common
 * arrangement rather than a universal fact, so it is stated here rather than
 * buried: if this store must charge VAT on the service charge too, the taxable
 * base in `create-order` is the line to change, not this file.
 */

/**
 * The charge to apply to one order, in minor units.
 *
 * Returns 0 for anything that is not a positive whole number, so the default
 * configuration (`0`) reproduces the previous behaviour exactly and a corrupt
 * or negative stored value can never turn into a credit.
 */
export function computeServiceCharge(configuredAmount: number): number {
  if (
    !Number.isFinite(configuredAmount) ||
    !Number.isInteger(configuredAmount) ||
    configuredAmount <= 0
  ) {
    return 0;
  }
  return configuredAmount;
}
