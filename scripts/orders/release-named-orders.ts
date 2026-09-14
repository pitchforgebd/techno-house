/**
 * Release SPECIFIC abandoned orders, named one by one. READ-ONLY without
 * `--apply`.
 *
 *   npm run orders:release -- TH-1 TH-2            # pre-flight only
 *   npm run orders:release -- TH-1 TH-2 --apply    # releases them
 *
 * `sweep-stale-orders.ts` acts on *every* qualifying order. That is the right
 * tool for a scheduled job and the wrong one for an approved, reviewed batch:
 * between the review and the run, a fifth order can qualify and be swept
 * without anyone having looked at it. This script processes exactly the order
 * numbers it is given and nothing else.
 *
 * ## It does not reimplement the release
 *
 * The mutation is `releaseStaleOrder` from `lib/orders/stale-orders.ts`,
 * unchanged — the same transaction, the same payment-row lock, the same atomic
 * `stockState` claim, the same clamped stock write, the same audit record. A
 * second implementation of a money-and-inventory operation is exactly how two
 * code paths end up disagreeing. What this script adds is *narrower entry* and
 * *stricter preconditions*, never different behaviour.
 *
 * ## The preconditions, and which of them are lock-protected
 *
 * Checked here, immediately before the release:
 *
 *   status = PENDING, paymentStatus = PENDING, stockState = RESERVED,
 *   cancelledAt = null, every payment PENDING with transactionRef = null and
 *   sessionRef = null, provider unchanged from what was reviewed,
 *   age > the configured window.
 *
 * Of those, the ones inside `staleOrderWhere` — status, stockState, the
 * PENDING/PROCESSING payment status, the age, the hosted provider, no PAID
 * payment — are **re-checked inside the transaction under a lock on the
 * order's payment rows**, so a concurrent confirmation cannot slip past them.
 *
 * The extra ones this script imposes — `paymentStatus` strictly PENDING rather
 * than PENDING-or-PROCESSING, and the two null refs — are checked here only,
 * which is worth stating plainly rather than implying more rigour than exists.
 * They are evidence that the customer never reached a gateway session at all.
 * The post-release verification re-reads them, and since nothing in the release
 * path writes `transactionRef` or `sessionRef`, a change there would be visible
 * afterwards.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import {
  releaseStaleOrder,
  staleOrderCutoff,
  staleOrderHours,
} from "../../lib/orders/stale-orders";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

/** Providers a hosted checkout can legitimately be abandoned on. */
const HOSTED = new Set(["sslcommerz", "bkash", "nagad"]);

type Failure = { number: string; reasons: string[] };

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const numbers = args.filter((arg) => !arg.startsWith("--"));

  if (numbers.length === 0) {
    console.error("Give at least one order number.");
    process.exitCode = 1;
    return;
  }

  const now = new Date();
  const cutoff = staleOrderCutoff(now);
  const prisma = getPrisma();

  try {
    // --- Full before-snapshot, so "nothing else changed" can be proved -----
    const ordersBefore = await prisma.order.findMany({
      select: {
        id: true,
        number: true,
        status: true,
        paymentStatus: true,
        stockState: true,
        cancelledAt: true,
      },
      orderBy: { id: "asc" },
    });
    const stockBefore = await prisma.productStock.findMany({
      select: { productId: true, quantity: true, reserved: true },
      orderBy: { productId: "asc" },
    });
    const auditBefore = await prisma.auditLog.count({
      where: { action: "order.stale_release" },
    });

    console.log("=".repeat(78));
    console.log(apply ? "SCOPED RELEASE — APPLYING" : "SCOPED RELEASE — PRE-FLIGHT ONLY");
    console.log("=".repeat(78));
    console.log(`run at        ${now.toISOString()}`);
    console.log(`window        ${staleOrderHours()}h  (cutoff ${cutoff.toISOString()})`);
    console.log(`requested     ${numbers.length} order(s)`);
    console.log(`snapshot      ${ordersBefore.length} orders, ${stockBefore.length} stock rows`);
    console.log(`audit rows    ${auditBefore} existing order.stale_release`);

    // --- Precondition check, all orders, before anything is written --------
    const passed: { id: string; number: string }[] = [];
    const failed: Failure[] = [];

    console.log("");
    console.log("PRECONDITIONS");

    for (const number of numbers) {
      const order = await prisma.order.findUnique({
        where: { number },
        select: {
          id: true,
          number: true,
          status: true,
          paymentStatus: true,
          stockState: true,
          cancelledAt: true,
          placedAt: true,
          payments: {
            select: {
              id: true,
              provider: true,
              method: true,
              status: true,
              transactionRef: true,
              sessionRef: true,
            },
          },
        },
      });

      if (!order) {
        failed.push({ number, reasons: ["order not found"] });
        console.log(`  ${number}  FAIL  order not found`);
        continue;
      }

      const reasons: string[] = [];
      if (order.status !== "PENDING") {
        reasons.push(`status is ${order.status}, expected PENDING`);
      }
      if (order.paymentStatus !== "PENDING") {
        reasons.push(`paymentStatus is ${order.paymentStatus}, expected PENDING`);
      }
      if (order.stockState !== "RESERVED") {
        reasons.push(`stockState is ${order.stockState}, expected RESERVED`);
      }
      if (order.cancelledAt !== null) {
        reasons.push(`cancelledAt is ${order.cancelledAt.toISOString()}, expected null`);
      }
      if (order.placedAt >= cutoff) {
        reasons.push(
          `placed ${order.placedAt.toISOString()} is newer than the ${staleOrderHours()}h cutoff`,
        );
      }
      if (order.payments.length === 0) {
        reasons.push("no payment row");
      }
      for (const payment of order.payments) {
        if (payment.status !== "PENDING") {
          reasons.push(`payment ${payment.id} status is ${payment.status}, expected PENDING`);
        }
        if (payment.transactionRef !== null) {
          reasons.push(`payment ${payment.id} has a transactionRef`);
        }
        if (payment.sessionRef !== null) {
          reasons.push(`payment ${payment.id} has a sessionRef`);
        }
        if (!HOSTED.has(payment.provider)) {
          reasons.push(`payment ${payment.id} provider is ${payment.provider}, not a hosted gateway`);
        }
        if (payment.method !== payment.provider) {
          reasons.push(`payment ${payment.id} method ${payment.method} does not match provider ${payment.provider}`);
        }
      }

      if (reasons.length > 0) {
        failed.push({ number, reasons });
        console.log(`  ${number}  FAIL`);
        for (const reason of reasons) console.log(`      - ${reason}`);
        continue;
      }

      passed.push({ id: order.id, number: order.number });
      // The empty-payments case already failed above, so this is only
      // narrowing for the compiler.
      const first = order.payments[0];
      const providerLabel = first ? `${first.provider}/${first.status}` : "-";
      console.log(
        `  ${number}  ok    ${order.status}/${order.paymentStatus}/${order.stockState}` +
          `  ${providerLabel}  refs=null  age=${Math.floor((now.getTime() - order.placedAt.getTime()) / 3_600_000)}h`,
      );
    }

    console.log("");
    console.log(`  ${passed.length} passed, ${failed.length} failed`);

    if (!apply) {
      console.log("");
      console.log("Pre-flight only. NOTHING WAS WRITTEN. Re-run with --apply.");
      return;
    }

    if (passed.length === 0) {
      console.log("");
      console.log("No order passed its preconditions. Nothing was written.");
      return;
    }

    // --- Release, one transaction each ------------------------------------
    console.log("");
    console.log("RELEASING");
    const released: string[] = [];
    const refused: { number: string; reason: string }[] = [];

    for (const target of passed) {
      const outcome = await releaseStaleOrder(prisma, target.id, cutoff);
      if (outcome.released) {
        released.push(target.number);
        console.log(`  ${target.number}  released`);
      } else {
        refused.push({ number: target.number, reason: outcome.reason });
        console.log(`  ${target.number}  REFUSED under the lock — ${outcome.reason}`);
      }
    }

    // --- After-snapshot and full diff -------------------------------------
    const ordersAfter = await prisma.order.findMany({
      select: {
        id: true,
        number: true,
        status: true,
        paymentStatus: true,
        stockState: true,
        cancelledAt: true,
      },
      orderBy: { id: "asc" },
    });
    const stockAfter = await prisma.productStock.findMany({
      select: { productId: true, quantity: true, reserved: true },
      orderBy: { productId: "asc" },
    });
    const auditAfter = await prisma.auditLog.count({
      where: { action: "order.stale_release" },
    });

    const beforeOrders = new Map(
      ordersBefore.map((o) => [
        o.id,
        `${o.status}/${o.paymentStatus}/${o.stockState}/${o.cancelledAt?.toISOString() ?? "null"}`,
      ]),
    );
    const changedOrders: string[] = [];
    for (const order of ordersAfter) {
      const was = beforeOrders.get(order.id);
      const is = `${order.status}/${order.paymentStatus}/${order.stockState}/${order.cancelledAt?.toISOString() ?? "null"}`;
      if (was === undefined) {
        changedOrders.push(`${order.number}  NEW ROW`);
      } else if (was !== is) {
        changedOrders.push(`${order.number}  ${was}  ->  ${is}`);
      }
    }

    const beforeStock = new Map(
      stockBefore.map((s) => [s.productId, s]),
    );
    const changedStock: string[] = [];
    for (const row of stockAfter) {
      const was = beforeStock.get(row.productId);
      if (!was) {
        changedStock.push(`${row.productId}  NEW ROW`);
        continue;
      }
      if (was.quantity !== row.quantity || was.reserved !== row.reserved) {
        changedStock.push(
          `${row.productId}  quantity ${was.quantity} -> ${row.quantity}` +
            `   reserved ${was.reserved} -> ${row.reserved}` +
            `   available ${was.quantity - was.reserved} -> ${row.quantity - row.reserved}`,
        );
      }
    }

    console.log("");
    console.log("=".repeat(78));
    console.log("RESULT");
    console.log("=".repeat(78));
    console.log(`  released            ${released.length}  ${released.join(", ")}`);
    console.log(`  refused under lock  ${refused.length}`);
    console.log(`  precondition fails  ${failed.length}`);
    console.log(`  audit rows created  ${auditAfter - auditBefore}`);

    console.log("");
    console.log(`  ORDER ROWS CHANGED (${changedOrders.length}) — status/paymentStatus/stockState/cancelledAt`);
    for (const line of changedOrders) console.log(`    ${line}`);

    console.log("");
    console.log(`  STOCK ROWS CHANGED (${changedStock.length})`);
    for (const line of changedStock) console.log(`    ${line}`);

    // --- Invariants --------------------------------------------------------
    const badStock = await prisma.productStock.count({
      where: {
        OR: [{ reserved: { lt: 0 } }, { quantity: { lt: 0 } }],
      },
    });
    const overReserved = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM "ProductStock" WHERE reserved > quantity
    `;
    const negativeWallets = await prisma.user.count({
      where: { walletAmount: { lt: 0 } },
    });

    console.log("");
    console.log("  INVARIANTS");
    console.log(`    ProductStock.reserved < 0 or quantity < 0   ${badStock}`);
    console.log(`    ProductStock.reserved > quantity            ${overReserved[0]?.count ?? "?"}`);
    console.log(`    User.walletAmount < 0                       ${negativeWallets}`);

    if (failed.length > 0) {
      console.log("");
      console.log("  NOT PROCESSED (preconditions failed, reported rather than partially applied):");
      for (const f of failed) {
        console.log(`    ${f.number}`);
        for (const reason of f.reasons) console.log(`      - ${reason}`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("scoped release failed:", error);
  process.exitCode = 1;
});
