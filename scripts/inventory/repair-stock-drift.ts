/**
 * Reconciles `ProductStock.reserved` with the reservations that open orders
 * actually justify (DSA-02 residue).
 *
 *   npx tsx scripts/inventory/repair-stock-drift.ts            # dry run
 *   npx tsx scripts/inventory/repair-stock-drift.ts --apply    # writes
 *
 * DRY RUN BY DEFAULT. Without `--apply` it prints exactly what it would change
 * and writes nothing.
 *
 * Reconciliation rule — deterministic, and the same one `inspect-stock-drift`
 * reports against:
 *
 *   reserved := SUM(OrderItem.quantity) for orders whose `stockState` is
 *               RESERVED and whose status still holds stock
 *               (PENDING / PROCESSING / SHIPPED)
 *
 * Orders that were deleted, cancelled, or delivered contribute nothing, which
 * is precisely the leak this repairs. `quantity` is never touched — only the
 * reservation counter.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

const APPLY = process.argv.includes("--apply");

async function main(): Promise<void> {
  const prisma = getPrisma();

  try {
    const justified = await prisma.orderItem.groupBy({
      by: ["productId"],
      where: {
        productId: { not: null },
        order: {
          stockState: "RESERVED",
          status: { in: ["PENDING", "PROCESSING", "SHIPPED"] },
        },
      },
      _sum: { quantity: true },
    });
    const expectedByProduct = new Map<string, number>();
    for (const row of justified) {
      if (row.productId) {
        expectedByProduct.set(row.productId, row._sum.quantity ?? 0);
      }
    }

    const stockRows = await prisma.productStock.findMany({
      where: { productId: { not: null } },
      select: { id: true, productId: true, quantity: true, reserved: true },
    });

    const changes = stockRows
      .map((row) => ({
        row,
        expected: expectedByProduct.get(row.productId!) ?? 0,
      }))
      .filter(({ row, expected }) => row.reserved !== expected);

    if (changes.length === 0) {
      console.log("Nothing to reconcile — every reserved count already matches.");
      return;
    }

    console.log(
      `${APPLY ? "APPLYING" : "DRY RUN — no writes"}: ${changes.length} row(s) to reconcile`,
    );
    for (const { row, expected } of changes) {
      console.log(
        `  ${row.productId}  quantity=${row.quantity}  reserved ${row.reserved} -> ${expected}`,
      );
    }

    if (!APPLY) {
      console.log("");
      console.log("Re-run with --apply to write these changes.");
      return;
    }

    for (const { row, expected } of changes) {
      await prisma.productStock.update({
        where: { id: row.id },
        data: { reserved: expected },
      });
    }
    console.log("");
    console.log(`Reconciled ${changes.length} row(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("stock repair crashed:", error);
  process.exitCode = 1;
});
