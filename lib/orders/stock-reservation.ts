/**
 * Inventory reservation lifecycle (DSA-02).
 *
 * `create-order` increments `ProductStock.reserved` when an order is placed.
 * Until this module existed nothing ever decremented it again, so every
 * cancelled, failed or delivered order held its units forever and each
 * product's availability ratcheted down to zero permanently.
 *
 * The whole design rests on `Order.stockState` being claimed atomically:
 *
 *   updateMany({ where: { id, stockState: <expected> }, data: { stockState: <next> } })
 *
 * Exactly one caller can win that write, so the stock adjustment underneath it
 * runs exactly once. That matters because release is reachable from two
 * independent paths — order cancellation and payment failure — and an order can
 * legitimately hit both.
 *
 * Every stock write is a single clamped SQL statement rather than a
 * read-modify-write, so it is safe under concurrency and can never drive a row
 * past the `ProductStock_reserved_within_quantity` constraint.
 */
import { syncVariantAggregateStock } from "@/lib/catalog/variant-stock";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Units this order claimed, per stock row it drew on: a variant line on its
 * variant's row, any other line on its product's row (AD-388).
 */
type ClaimedUnits = {
  productId: string;
  variantId: string | null;
  quantity: number;
};

async function claimedUnits(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<ClaimedUnits[]> {
  const rows = await tx.orderItem.groupBy({
    by: ["productId", "variantId"],
    where: { orderId, productId: { not: null } },
    _sum: { quantity: true },
  });
  const claimed: ClaimedUnits[] = [];
  for (const row of rows) {
    const quantity = row._sum.quantity ?? 0;
    if (row.productId && quantity > 0) {
      claimed.push({
        productId: row.productId,
        variantId: row.variantId,
        quantity,
      });
    }
  }
  return claimed;
}

/**
 * A variant product's own row is the sum of its variants', so it is
 * re-derived after any of them moves rather than adjusted separately.
 */
async function resyncVariantProducts(
  tx: Prisma.TransactionClient,
  claimed: ClaimedUnits[],
): Promise<void> {
  const productIds = new Set(
    claimed.filter((entry) => entry.variantId).map((entry) => entry.productId),
  );
  for (const productId of productIds) {
    await syncVariantAggregateStock(tx, productId);
  }
}

/**
 * Hands units back to available stock.
 *
 * `GREATEST(0, …)` is belt-and-braces: the claim above already guarantees this
 * runs once per order, but a row that drifted before this module existed must
 * not be driven negative and trip the CHECK constraint.
 */
async function releaseUnits(
  tx: Prisma.TransactionClient,
  claimed: ClaimedUnits[],
): Promise<void> {
  for (const { productId, variantId, quantity } of claimed) {
    if (variantId) {
      await tx.$executeRaw`
        UPDATE "ProductStock"
        SET "reserved" = GREATEST(0, "reserved" - ${quantity})
        WHERE "variantId" = ${variantId}
      `;
    } else {
      await tx.$executeRaw`
        UPDATE "ProductStock"
        SET "reserved" = GREATEST(0, "reserved" - ${quantity})
        WHERE "productId" = ${productId}
      `;
    }
  }
  await resyncVariantProducts(tx, claimed);
}

/**
 * Turns a reservation into a real stock decrement — the goods have left.
 *
 * Both columns move together in one statement so the row can never be observed
 * with `quantity` reduced but `reserved` still held.
 */
async function convertUnits(
  tx: Prisma.TransactionClient,
  claimed: ClaimedUnits[],
): Promise<void> {
  for (const { productId, variantId, quantity } of claimed) {
    if (variantId) {
      await tx.$executeRaw`
        UPDATE "ProductStock"
        SET "reserved" = GREATEST(0, "reserved" - ${quantity}),
            "quantity" = GREATEST(0, "quantity" - ${quantity})
        WHERE "variantId" = ${variantId}
      `;
    } else {
      await tx.$executeRaw`
        UPDATE "ProductStock"
        SET "reserved" = GREATEST(0, "reserved" - ${quantity}),
            "quantity" = GREATEST(0, "quantity" - ${quantity})
        WHERE "productId" = ${productId}
      `;
    }
  }
  await resyncVariantProducts(tx, claimed);
}

/** Re-claims units, used when a cancelled order is reopened. */
async function reserveUnits(
  tx: Prisma.TransactionClient,
  claimed: ClaimedUnits[],
): Promise<void> {
  for (const { productId, variantId, quantity } of claimed) {
    if (variantId) {
      await tx.$executeRaw`
        UPDATE "ProductStock"
        SET "reserved" = LEAST("quantity", "reserved" + ${quantity})
        WHERE "variantId" = ${variantId}
      `;
    } else {
      await tx.$executeRaw`
        UPDATE "ProductStock"
        SET "reserved" = LEAST("quantity", "reserved" + ${quantity})
        WHERE "productId" = ${productId}
      `;
    }
  }
  await resyncVariantProducts(tx, claimed);
}

/**
 * Claims the order's stock state transition. Returns false when another caller
 * already made this transition, in which case the caller must not touch stock.
 */
async function claimTransition(
  tx: Prisma.TransactionClient,
  orderId: string,
  from: "RESERVED" | "RELEASED",
  to: "RELEASED" | "CONVERTED" | "RESERVED",
): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, stockState: from },
    data: { stockState: to },
  });
  return claimed.count === 1;
}

/**
 * Returns this order's units to available stock. Idempotent — calling it again,
 * or from the other release path, is a no-op.
 */
export async function releaseOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<boolean> {
  if (!(await claimTransition(tx, orderId, "RESERVED", "RELEASED"))) {
    return false;
  }
  await releaseUnits(tx, await claimedUnits(tx, orderId));
  return true;
}

/**
 * Converts this order's reservation into a permanent stock decrement.
 * Idempotent. Only an order still holding its reservation can convert — one
 * already released (cancelled, then marked delivered) is left alone.
 */
export async function convertOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<boolean> {
  if (!(await claimTransition(tx, orderId, "RESERVED", "CONVERTED"))) {
    return false;
  }
  await convertUnits(tx, await claimedUnits(tx, orderId));
  return true;
}

/**
 * Re-reserves a previously released order — the admin moved a cancelled order
 * back to PENDING. Idempotent, and deliberately one-way from RELEASED only: a
 * CONVERTED (delivered) order is not reopened this way.
 */
export async function reReserveOrderStock(
  tx: Prisma.TransactionClient,
  orderId: string,
): Promise<boolean> {
  if (!(await claimTransition(tx, orderId, "RELEASED", "RESERVED"))) {
    return false;
  }
  await reserveUnits(tx, await claimedUnits(tx, orderId));
  return true;
}
