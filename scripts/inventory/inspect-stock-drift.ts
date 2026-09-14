/**
 * READ-ONLY inventory drift report (DSA-01 / DSA-02).
 *
 *   npm run inventory:inspect
 *
 * Answers the questions that have to be settled before any repair or database
 * constraint can be considered:
 *
 *   - Does any stock row already violate `reserved <= quantity`? (A CHECK
 *     constraint cannot be added while one does.)
 *   - Is any `reserved` negative?
 *   - How far has `reserved` drifted from the reservations that open orders
 *     actually justify?
 *   - How many reserved units are held by orders that are CANCELLED or
 *     DELIVERED — i.e. stock that should have been released or converted?
 *
 * This script performs NO writes. It only counts, aggregates and prints.
 * It changes nothing and is safe to run against live data.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

/** Order states that legitimately still hold a reservation. */
const HOLDING_STATUSES = ["PENDING", "PROCESSING", "SHIPPED"] as const;
/** Order states whose reservation should already have been released. */
const RELEASED_STATUSES = ["CANCELLED"] as const;
/** Delivered orders should have converted reservation into a stock decrement. */
const CONVERTED_STATUSES = ["DELIVERED"] as const;

async function main(): Promise<void> {
  const prisma = getPrisma();

  try {
    const stockRows = await prisma.productStock.findMany({
      select: {
        id: true,
        productId: true,
        variantId: true,
        quantity: true,
        reserved: true,
      },
    });

    console.log(`ProductStock rows: ${stockRows.length}`);

    const overReserved = stockRows.filter((r) => r.reserved > r.quantity);
    const negative = stockRows.filter((r) => r.reserved < 0);
    const anyReserved = stockRows.filter((r) => r.reserved > 0);

    console.log(`  rows with reserved > quantity : ${overReserved.length}`);
    console.log(`  rows with reserved < 0        : ${negative.length}`);
    console.log(`  rows with reserved > 0        : ${anyReserved.length}`);

    // Reservations that open orders actually justify, per product.
    async function reservedByStatuses(
      statuses: readonly string[],
    ): Promise<Map<string, number>> {
      const grouped = await prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          productId: { not: null },
          order: { status: { in: statuses as never } },
        },
        _sum: { quantity: true },
      });
      const map = new Map<string, number>();
      for (const row of grouped) {
        if (row.productId) {
          map.set(row.productId, row._sum.quantity ?? 0);
        }
      }
      return map;
    }

    const [holding, released, converted] = await Promise.all([
      reservedByStatuses(HOLDING_STATUSES),
      reservedByStatuses(RELEASED_STATUSES),
      reservedByStatuses(CONVERTED_STATUSES),
    ]);

    let driftRows = 0;
    let driftUnits = 0;
    let heldByCancelled = 0;
    let heldByDelivered = 0;
    const worst: {
      productId: string;
      quantity: number;
      reserved: number;
      expected: number;
    }[] = [];

    for (const row of stockRows) {
      if (!row.productId) {
        continue;
      }
      const expected = holding.get(row.productId) ?? 0;
      heldByCancelled += released.get(row.productId) ?? 0;
      heldByDelivered += converted.get(row.productId) ?? 0;
      if (row.reserved !== expected) {
        driftRows += 1;
        driftUnits += Math.abs(row.reserved - expected);
        worst.push({
          productId: row.productId,
          quantity: row.quantity,
          reserved: row.reserved,
          expected,
        });
      }
    }

    console.log("");
    console.log("Drift vs. reservations justified by open orders");
    console.log(`  stock rows whose reserved is wrong : ${driftRows}`);
    console.log(`  total units of drift               : ${driftUnits}`);
    console.log(
      `  units still reserved by CANCELLED orders : ${heldByCancelled}`,
    );
    console.log(
      `  units still reserved by DELIVERED orders : ${heldByDelivered}`,
    );

    if (worst.length > 0) {
      console.log("");
      console.log("Worst 10 drifted rows (productId, quantity, reserved, expected):");
      worst
        .sort(
          (a, b) =>
            Math.abs(b.reserved - b.expected) - Math.abs(a.reserved - a.expected),
        )
        .slice(0, 10)
        .forEach((r) => {
          console.log(
            `  ${r.productId}  qty=${r.quantity}  reserved=${r.reserved}  expected=${r.expected}`,
          );
        });
    }

    console.log("");
    console.log(
      overReserved.length === 0 && negative.length === 0
        ? "VERDICT: no row violates reserved <= quantity or reserved >= 0 — a CHECK constraint could be added without repairing data first."
        : "VERDICT: existing rows violate the invariant — data must be reconciled BEFORE any CHECK constraint is added.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("inventory inspection crashed:", error);
  process.exitCode = 1;
});
