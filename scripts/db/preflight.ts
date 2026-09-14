/**
 * Production database preflight — READ ONLY.
 *
 *   npm run db:preflight
 *
 * Safe to run against production at any time. It issues SELECTs only: no
 * transaction, no fixture, no UPDATE/INSERT/DELETE, and it creates nothing it
 * would then have to clean up.
 *
 * ## Why this exists separately from the test suites
 *
 * `test:inventory`, `test:hardening` and the rest prove that the *code* holds
 * its invariants — they create their own orders, products and customers to do
 * it. That makes them exactly the wrong thing to point at production. This
 * asks a different question: does the data that is already there satisfy the
 * invariants the code now depends on?
 *
 * That question matters most on a database that existed *before* the
 * constraints did. Every CHECK added during the remediation was applied to a
 * schema whose existing rows already satisfied it, but a different deployment
 * — a restored backup, a database that ran the old code for longer — may not
 * be in that position. A `reserved > quantity` row would make the next order
 * for that product behave incorrectly, and nothing in the application would
 * report it.
 *
 * ## It never repairs anything
 *
 * Reconciliation is a decision, not a cleanup. A negative `reserved` could mean
 * a double release, or a manual edit, or a restore from a partial backup, and
 * the right repair differs in each case. This reports and exits non-zero;
 * `scripts/inventory/inspect-stock-drift.ts` and its repair counterpart are
 * where a reconciliation is proposed and — separately, deliberately — applied.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

type Severity = "CRITICAL" | "WARNING";

type Result = {
  name: string;
  severity: Severity;
  count: number;
  detail: string;
  /** What to do about it. Never executed — printed. */
  impact: string;
};

const results: Result[] = [];

function record(
  name: string,
  severity: Severity,
  count: number,
  detail: string,
  impact: string,
): void {
  results.push({ name, severity, count, detail, impact });
}

async function main(): Promise<void> {
  const prisma = getPrisma();

  try {
    const url = process.env.DATABASE_URL ?? "";
    let target = "(unparseable)";
    try {
      const parsed = new URL(url);
      // Host and database name only — never the credentials.
      target = `${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`;
    } catch {
      /* leave the placeholder */
    }

    console.log("=".repeat(74));
    console.log("DATABASE PREFLIGHT — READ ONLY");
    console.log("=".repeat(74));
    console.log(`target     ${target}`);
    console.log(`node_env   ${process.env.NODE_ENV ?? "(unset)"}`);
    console.log(`run at     ${new Date().toISOString()}`);
    console.log("");

    // --- Stock ledger -------------------------------------------------------
    const negativeReserved = await prisma.productStock.count({
      where: { reserved: { lt: 0 } },
    });
    record(
      "reserved >= 0",
      "CRITICAL",
      negativeReserved,
      `${negativeReserved} stock row(s) with a negative reservation`,
      "A negative reservation inflates availability, so the store can sell units it does not have.",
    );

    const negativeQuantity = await prisma.productStock.count({
      where: { quantity: { lt: 0 } },
    });
    record(
      "quantity >= 0",
      "CRITICAL",
      negativeQuantity,
      `${negativeQuantity} stock row(s) with a negative quantity`,
      "A negative quantity means the on-hand ledger has been driven below empty.",
    );

    // Prisma cannot compare two columns, so this one is raw.
    const overReserved = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM "ProductStock" WHERE reserved > quantity
    `;
    const overReservedCount = Number(overReserved[0]?.count ?? 0);
    record(
      "reserved <= quantity",
      "CRITICAL",
      overReservedCount,
      `${overReservedCount} stock row(s) reserving more than they hold`,
      "Availability reads as negative, so the product becomes unbuyable while stock is on the shelf.",
    );

    // --- Money --------------------------------------------------------------
    const negativeWallets = await prisma.user.count({
      where: { walletAmount: { lt: 0 } },
    });
    record(
      "wallet balances >= 0",
      "CRITICAL",
      negativeWallets,
      `${negativeWallets} customer(s) with a negative wallet balance`,
      "The store owes money it has no record of accepting. Wallet debits are guarded, so a negative balance predates the guard or was written directly.",
    );

    const negativeServiceCharge = await prisma.order.count({
      where: { serviceChargeAmount: { lt: 0 } },
    });
    record(
      "service charge >= 0",
      "CRITICAL",
      negativeServiceCharge,
      `${negativeServiceCharge} order(s) with a negative service charge`,
      "A charge stored as a credit silently reduces the order total.",
    );

    // --- Impossible order / payment states ----------------------------------
    // A cancelled order still holding stock. The release path claims
    // `stockState` atomically, so this pairing should not be reachable.
    const cancelledButReserved = await prisma.order.count({
      where: { status: "CANCELLED", stockState: "RESERVED" },
    });
    record(
      "no cancelled order still holding stock",
      "CRITICAL",
      cancelledButReserved,
      `${cancelledButReserved} cancelled order(s) with stockState RESERVED`,
      "Those units are held against a dead order and will never be released by any code path.",
    );

    // A delivered order that never converted its reservation into a real
    // decrement — the drift `convertOrderStock` exists to prevent.
    const deliveredNotConverted = await prisma.order.count({
      where: { status: "DELIVERED", stockState: { not: "CONVERTED" } },
    });
    record(
      "delivered orders converted their stock",
      "WARNING",
      deliveredNotConverted,
      `${deliveredNotConverted} delivered order(s) whose stock was not converted`,
      "Goods left the building without ProductStock.quantity being decremented, so on-hand counts read high. Expected to be non-zero on a database that predates the stockState column.",
    );

    // Paid at the payment row but not on the order, or the reverse.
    const paymentOrderMismatch = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM "Order" o
      WHERE o."paymentStatus" = 'PAID'
        AND NOT EXISTS (
          SELECT 1 FROM "Payment" p WHERE p."orderId" = o.id AND p.status = 'PAID'
        )
    `;
    const mismatchCount = Number(paymentOrderMismatch[0]?.count ?? 0);
    record(
      "orders marked PAID have a PAID payment",
      "CRITICAL",
      mismatchCount,
      `${mismatchCount} order(s) marked PAID with no paid payment row`,
      "The order ledger and the payment ledger disagree about money received.",
    );

    // --- Refunds ------------------------------------------------------------
    const duplicateOpenRefunds = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM (
        SELECT "orderId" FROM "Refund"
        WHERE status IN ('REQUESTED', 'APPROVED')
        GROUP BY "orderId" HAVING count(*) > 1
      ) t
    `;
    const duplicateRefundCount = Number(duplicateOpenRefunds[0]?.count ?? 0);
    record(
      "one open refund per order",
      "CRITICAL",
      duplicateRefundCount,
      `${duplicateRefundCount} order(s) with more than one open refund`,
      "Two open refunds on one order is the shape that pays a customer twice. A partial unique index should make this unreachable — a non-zero count means the index is missing.",
    );

    // --- Referential sanity -------------------------------------------------
    // A reservation is only meaningful if it belongs to a live order.
    const orphanReservations = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM "ProductStock" s
      WHERE s.reserved > 0
        AND NOT EXISTS (
          SELECT 1
          FROM "OrderItem" i
          JOIN "Order" o ON o.id = i."orderId"
          WHERE i."productId" = s."productId" AND o."stockState" = 'RESERVED'
        )
    `;
    const orphanCount = Number(orphanReservations[0]?.count ?? 0);
    record(
      "reservations belong to a reserving order",
      "WARNING",
      orphanCount,
      `${orphanCount} stock row(s) reserving units with no RESERVED order behind them`,
      "Units are held by nothing. This is the classic pre-remediation drift and is what scripts/inventory/inspect-stock-drift.ts reports in detail.",
    );

    // --- Stale reservations that a sweep would clear -------------------------
    // Not corruption — reported so the operator knows whether the scheduler is
    // running before they go looking for a stock problem.
    const staleHours = Number(process.env.STALE_ORDER_RELEASE_HOURS ?? 24) || 24;
    const staleCutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000);
    const staleCandidates = await prisma.order.count({
      where: {
        status: "PENDING",
        stockState: "RESERVED",
        paymentStatus: { in: ["PENDING", "PROCESSING"] },
        placedAt: { lt: staleCutoff },
        AND: [
          {
            payments: {
              some: { provider: { in: ["sslcommerz", "bkash", "nagad"] } },
            },
          },
          { payments: { none: { provider: "cod" } } },
          { payments: { none: { status: "PAID" } } },
        ],
      },
    });
    record(
      "abandoned checkouts are being swept",
      "WARNING",
      staleCandidates,
      `${staleCandidates} abandoned order(s) older than ${staleHours}h still holding stock`,
      "Not corruption. A steadily growing number here means the stale-order scheduler is not running. Inspect with `npm run orders:stale:inspect`.",
    );

    // --- Report -------------------------------------------------------------
    const failures = results.filter((r) => r.count > 0);
    const critical = failures.filter((r) => r.severity === "CRITICAL");

    for (const result of results) {
      const mark = result.count === 0 ? "ok  " : result.severity === "CRITICAL" ? "FAIL" : "warn";
      console.log(`  ${mark}  ${result.name}`);
      if (result.count > 0) {
        console.log(`        ${result.detail}`);
        console.log(`        impact: ${result.impact}`);
      }
    }

    console.log("");
    console.log("-".repeat(74));
    if (failures.length === 0) {
      console.log(`PREFLIGHT PASSED — ${results.length} invariants, 0 violations.`);
      console.log("Nothing was written.");
      return;
    }

    console.log(
      `PREFLIGHT FOUND ${failures.length} ISSUE(S) — ${critical.length} critical.`,
    );
    console.log("");
    console.log("NOTHING WAS REPAIRED. Reconciliation is a decision, not a cleanup:");
    console.log("  1. Read the detail above and establish how the rows got there.");
    console.log("  2. `npm run orders:stale:inspect`  — abandoned checkouts, read-only.");
    console.log("  3. `npm run inventory:inspect`     — reservation drift, read-only.");
    console.log("  4. Take a database backup.");
    console.log("  5. Only then consider a repair, and apply it deliberately.");

    if (critical.length > 0) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("preflight failed:", error);
  process.exitCode = 1;
});
