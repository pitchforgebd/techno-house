import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Public order number.
 *
 * A short, strictly increasing number drawn from the `order_number_seq`
 * Postgres sequence — "100001", "100002", and so on.
 *
 * Why a sequence rather than counting rows or generating a random value:
 *
 * - `MAX(number) + 1` is a race. Two checkouts reading at the same instant
 *   both see the same maximum and both try to write the same number; one
 *   fails, and under load they fail repeatedly. Order numbers are money-
 *   critical identifiers printed on invoices, so "usually unique" is not
 *   good enough.
 * - `nextval` never returns a value twice, even to concurrent transactions,
 *   and deliberately does not roll back. A checkout that fails after drawing
 *   a number leaves a gap rather than releasing it for reuse. Gaps are
 *   harmless; a number reused across two different orders is not.
 *
 * The sequence starts at 100001 so numbers are six digits immediately and do
 * not advertise how many orders the store has taken.
 *
 * Older orders keep their `TH-YYYYMMDD-XXXXXXXX` numbers. Nothing parses the
 * format for meaning, and lookups are plain string matches, so the two live
 * side by side. `looksLikeOrderNumber` in `public-tracking.ts` already
 * accepted bare digits.
 */
export async function nextOrderNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.$queryRaw<
    { value: bigint }[]
  >`SELECT nextval('order_number_seq') AS value`;
  const value = rows[0]?.value;
  if (value == null) {
    throw new Error("Could not allocate an order number.");
  }

  const number = value.toString();
  // The sequence cannot produce anything but digits, so this can only fire if
  // the generator is changed later. That is exactly when it is wanted: the
  // order number is the reference printed on invoices, sent to three payment
  // gateways as their transaction id, quoted in support threads and used in
  // every customer-facing URL, so a format change must be a deliberate act
  // rather than something that ships because a helper was edited.
  //
  // Refusing here rather than at the call site means every future path that
  // allocates a number inherits the check. `Order_number_format` in the
  // database is the real backstop — this exists so the failure arrives with a
  // message that says what went wrong instead of a constraint violation.
  if (!isNumericOrderNumber(number)) {
    throw new Error(
      `Generated order number ${JSON.stringify(number)} is not numeric. ` +
        "New order numbers must be digits only.",
    );
  }
  return number;
}

/** Digits only, no sign, no separators, at least one digit. */
export function isNumericOrderNumber(value: string): boolean {
  return /^[0-9]+$/.test(value);
}

/**
 * Legacy `TH-YYYYMMDD-XXXXXXXX` numbers, which predate the sequence.
 *
 * Kept readable, never generated. They are printed on invoices, recorded at
 * the gateways as `tran_id`, and quoted in support threads, so they must keep
 * resolving forever — which is why the database constraint permits them and
 * why nothing renumbers them.
 */
export function isLegacyOrderNumber(value: string): boolean {
  return value.startsWith("TH-");
}

/** What the database will accept in `Order.number`. Mirrors the CHECK. */
export function isStorableOrderNumber(value: string): boolean {
  return isNumericOrderNumber(value) || isLegacyOrderNumber(value);
}
