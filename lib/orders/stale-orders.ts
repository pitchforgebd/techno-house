/**
 * Abandoned-checkout stock release.
 *
 * `create-order` reserves stock the instant an order row is written, before the
 * customer has been anywhere near the payment gateway.
 * `lib/orders/stock-reservation.ts` (DSA-02) gave every *resolved* order a way
 * to hand those units back — cancelled, failed, delivered. It did nothing for
 * the order that simply never resolves: the customer is redirected to bKash,
 * closes the tab, and the order sits at `PENDING` / `RESERVED` forever with the
 * stock still held. Nothing in the application ever looks at it again.
 *
 * The effect is one-directional and cumulative. Every abandoned checkout
 * permanently lowers the availability of the products it touched, so a popular
 * item drifts towards "out of stock" while the warehouse is full. That is worse
 * than a lost sale — it is a lost sale that quietly causes more lost sales.
 *
 * ## What this deliberately does NOT do
 *
 * **It never touches a cash-on-delivery order.** A COD order legitimately sits
 * at `PENDING` and unpaid until someone hands over money at the door, which may
 * be days later. Selection is therefore *positive*: an order is a candidate
 * only if it has a payment row for a hosted gateway. An order with no payment
 * row at all, or a COD one, is never considered — if the selection is wrong it
 * fails by leaving stock held, which is the pre-existing behaviour, rather than
 * by cancelling real orders.
 *
 * **It never touches an order a human has moved.** `PENDING` status and a
 * `PENDING`/`PROCESSING` payment are both required. Once staff confirm, cancel,
 * or mark an order paid it is out of scope permanently.
 *
 * ## Why the order is cancelled and not merely un-reserved
 *
 * Releasing the stock while leaving the order `PENDING` looks gentler and is
 * actually worse: `convertOrderStock` only converts from `RESERVED`, so if that
 * order were later marked delivered its units would never be decremented from
 * `quantity` and the ledger would drift — the exact class of bug this module
 * exists to end. The stock state and the order state have to move together. An
 * order whose payment never arrived is not pending; it is over.
 *
 * ## A late payment cannot silently revive it
 *
 * `CANCELLED` is terminal in `lib/payments/status.ts`, so a webhook arriving
 * after a sweep is refused rather than marking a stock-released order paid.
 * That refusal is the correct outcome: those units may already have been sold
 * to somebody else, so the money needs a person to look at it, not an automatic
 * state change. With the default window this is close to unreachable anyway —
 * hosted gateway sessions expire in under an hour.
 */
import type { Prisma, PrismaClient } from "@/lib/generated/prisma/client";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { releaseOrderStock } from "@/lib/orders/stock-reservation";

/** Gateways whose orders can legitimately be abandoned mid-payment. */
const HOSTED_PROVIDERS = ["sslcommerz", "bkash", "nagad"] as const;

export const DEFAULT_STALE_ORDER_HOURS = 24;
const MIN_STALE_ORDER_HOURS = 1;
const MAX_STALE_ORDER_HOURS = 24 * 30;

/** How many orders one sweep will act on. Keeps a first run bounded. */
export const DEFAULT_SWEEP_LIMIT = 200;

/**
 * The abandonment window, in hours.
 *
 * 24 hours by default — long enough that it cannot collide with a customer who
 * is genuinely still paying (every hosted gateway session expires inside an
 * hour), short enough that a day of abandoned carts does not accumulate against
 * a product's availability.
 *
 * `STALE_ORDER_RELEASE_HOURS` overrides it. An unparseable or out-of-range
 * value falls back to the default rather than being clamped silently to
 * something surprising — a typo of "0" must not turn into "cancel everything
 * placed in the last minute".
 */
export function staleOrderHours(
  raw: string | undefined = process.env.STALE_ORDER_RELEASE_HOURS,
): number {
  if (!raw) {
    return DEFAULT_STALE_ORDER_HOURS;
  }
  const value = Number(raw.trim());
  if (
    !Number.isFinite(value) ||
    !Number.isInteger(value) ||
    value < MIN_STALE_ORDER_HOURS ||
    value > MAX_STALE_ORDER_HOURS
  ) {
    return DEFAULT_STALE_ORDER_HOURS;
  }
  return value;
}

export function staleOrderCutoff(now: Date = new Date()): Date {
  return new Date(now.getTime() - staleOrderHours() * 60 * 60 * 1000);
}

/**
 * Which orders count as abandoned.
 *
 * Exported so the read-only inspector and the sweeper cannot disagree about
 * what they are looking at — the inspector's report would be worthless if it
 * described a different set from the one that gets acted on.
 */
export function staleOrderWhere(cutoff: Date): Prisma.OrderWhereInput {
  return {
    status: "PENDING",
    stockState: "RESERVED",
    paymentStatus: { in: ["PENDING", "PROCESSING"] },
    placedAt: { lt: cutoff },
    AND: [
      // Positive selection: it must have gone to a hosted gateway.
      { payments: { some: { provider: { in: [...HOSTED_PROVIDERS] } } } },
      // And nothing about it may look settled or offline.
      { payments: { none: { provider: "cod" } } },
      { payments: { none: { status: "PAID" } } },
    ],
  };
}

export type StaleOrderSummary = {
  id: string;
  number: string;
  placedAt: Date;
  totalAmount: number;
  provider: string | null;
  /** Units this order is holding, summed across its lines. */
  heldUnits: number;
};

/** Read-only. Safe to run against production at any time. */
export async function findStaleOrders(
  prisma: PrismaClient,
  options: { cutoff?: Date; limit?: number } = {},
): Promise<StaleOrderSummary[]> {
  const cutoff = options.cutoff ?? staleOrderCutoff();
  const rows = await prisma.order.findMany({
    where: staleOrderWhere(cutoff),
    orderBy: { placedAt: "asc" },
    take: options.limit ?? DEFAULT_SWEEP_LIMIT,
    select: {
      id: true,
      number: true,
      placedAt: true,
      totalAmount: true,
      payments: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { provider: true },
      },
      items: { select: { quantity: true, productId: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    number: row.number,
    placedAt: row.placedAt,
    totalAmount: row.totalAmount,
    provider: row.payments[0]?.provider ?? null,
    heldUnits: row.items.reduce(
      (sum, item) => sum + (item.productId ? item.quantity : 0),
      0,
    ),
  }));
}

export type ReleaseOutcome =
  | { released: true }
  /** The order moved between being listed and being acted on. */
  | { released: false; reason: string };

/**
 * Releases one abandoned order, or declines to.
 *
 * ## Lock ordering
 *
 * The payment rows are locked FIRST, then the order row is written. That is the
 * same order `applyPaymentTransition` uses (`SELECT ... FROM "Payment" ... FOR
 * UPDATE`, then `tx.order.update`), and matching it is not cosmetic: taking the
 * order first and the payment second would give two paths that acquire the same
 * two locks in opposite orders, which is a deadlock waiting for the day a
 * webhook lands during a sweep.
 *
 * Holding that lock is also what makes the re-check below meaningful. A
 * confirmation already in flight commits before this transaction can read, so
 * the payment is seen as `PAID` and the order is left alone.
 */
export async function releaseStaleOrder(
  prisma: PrismaClient,
  orderId: string,
  cutoff: Date,
): Promise<ReleaseOutcome> {
  const outcome = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT id FROM "Payment" WHERE "orderId" = ${orderId} ORDER BY id FOR UPDATE
    `;

    // Re-read under the lock. Everything before this point was advisory.
    const fresh = await tx.order.findFirst({
      where: { id: orderId, ...staleOrderWhere(cutoff) },
      select: {
        id: true,
        number: true,
        placedAt: true,
        payments: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { provider: true },
        },
        items: { select: { quantity: true, productId: true } },
      },
    });
    if (!fresh) {
      return {
        released: false as const,
        reason: "The order changed before it could be released.",
      };
    }

    // Claims `stockState` RESERVED -> RELEASED atomically, so even if this ran
    // twice the units would only go back once.
    if (!(await releaseOrderStock(tx, orderId))) {
      return {
        released: false as const,
        reason: "Another path already released this order's stock.",
      };
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        status: "CANCELLED",
        paymentStatus: "CANCELLED",
        cancelledAt: new Date(),
      },
    });

    // PENDING -> CANCELLED and PROCESSING -> CANCELLED are both legal edges in
    // `lib/payments/status.ts`. The `where` clause is what enforces that here:
    // `applyPaymentTransition` cannot be called from inside a transaction (it
    // opens its own, and a nested call on the pooled client is the shape that
    // deadlocked the wallet path), so the guard is expressed as the update's
    // own condition rather than borrowed from the state machine.
    await tx.payment.updateMany({
      where: { orderId, status: { in: ["PENDING", "PROCESSING"] } },
      data: {
        status: "CANCELLED",
        failureReason: "Abandoned at checkout; stock returned to inventory.",
      },
    });

    return {
      released: true as const,
      record: {
        orderNumber: fresh.number,
        placedAt: fresh.placedAt.toISOString(),
        provider: fresh.payments[0]?.provider ?? null,
        unitsReturned: fresh.items.reduce(
          (sum, item) => sum + (item.productId ? item.quantity : 0),
          0,
        ),
      },
    };
  });

  if (!outcome.released) {
    return { released: false, reason: outcome.reason };
  }

  // Written AFTER the transaction commits, never inside it. `writeAuditLog`
  // uses the pooled global client, so calling it from within an interactive
  // transaction takes a second connection while holding the first — with
  // `max: 5` that is the deadlock that took down the wallet path (AD-321).
  //
  // It lives here rather than in the batch wrapper so that every release is
  // recorded, however it was triggered. An order cancelling itself is exactly
  // the kind of event that looks inexplicable six months later, so the row
  // names the window that caused it.
  await writeAuditLog({
    actorType: "SYSTEM",
    actorLabel: "stale-order sweep",
    action: AUDIT_ACTIONS.ORDER_STALE_RELEASE,
    entityType: "Order",
    entityId: orderId,
    metadata: { ...outcome.record, windowHours: staleOrderHours() },
  });

  return { released: true };
}

export type SweepResult = {
  cutoff: Date;
  /** How many abandoned orders were found. */
  found: number;
  released: number;
  /** Orders that moved under us; not an error. */
  skipped: number;
  releasedNumbers: string[];
  unitsReturned: number;
};

/**
 * Releases every abandoned order older than the window.
 *
 * One transaction per order rather than one for the batch. A single failure
 * then costs one order instead of the whole run, and no transaction is held
 * open across hundreds of row locks on a `max: 5` connection pool.
 */
export async function sweepStaleOrders(
  prisma: PrismaClient,
  options: { cutoff?: Date; limit?: number } = {},
): Promise<SweepResult> {
  const cutoff = options.cutoff ?? staleOrderCutoff();
  const candidates = await findStaleOrders(prisma, {
    cutoff,
    limit: options.limit,
  });

  let released = 0;
  let skipped = 0;
  let unitsReturned = 0;
  const releasedNumbers: string[] = [];

  for (const candidate of candidates) {
    const outcome = await releaseStaleOrder(prisma, candidate.id, cutoff);
    if (!outcome.released) {
      skipped += 1;
      continue;
    }
    released += 1;
    unitsReturned += candidate.heldUnits;
    releasedNumbers.push(candidate.number);
  }

  return {
    cutoff,
    found: candidates.length,
    released,
    skipped,
    releasedNumbers,
    unitsReturned,
  };
}
