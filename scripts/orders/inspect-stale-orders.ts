/**
 * Abandoned-checkout inspector — READ ONLY.
 *
 *   npm run orders:stale:inspect
 *
 * Shows, for every order the sweeper would act on, the full current state and
 * the exact field-level changes a sweep would make. It opens no transaction,
 * issues no UPDATE, INSERT or DELETE, and imports nothing from
 * `lib/orders/stale-orders.ts` except the read-only selection predicate.
 *
 * It exists separately from `sweep-stale-orders.ts --dry-run` because the two
 * answer different questions. The dry run answers "how many, and which?" — a
 * list you can eyeball. This answers "what exactly changes, and what is the
 * stock consequence?", which is what somebody actually needs in order to
 * approve the operation. "4 orders would be cancelled" is not something anyone
 * can reasonably say yes to.
 *
 * The predicate is imported rather than re-written, deliberately: a report
 * describing a different set of rows from the one the sweeper acts on would be
 * worse than no report at all.
 *
 * ## The shared-stock note in the output
 *
 * `ProductStock` is unique per product, so two abandoned orders for the same
 * product contend on one row. The report flags that, because otherwise the
 * per-order "reserved goes from 3 to 1" lines look contradictory when read
 * together.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import {
  DEFAULT_SWEEP_LIMIT,
  staleOrderCutoff,
  staleOrderHours,
  staleOrderWhere,
} from "../../lib/orders/stale-orders";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

const HOUR_MS = 60 * 60 * 1000;

function money(amount: number): string {
  return amount.toLocaleString("en-US");
}

function ageOf(placedAt: Date, now: Date): string {
  const hours = Math.floor((now.getTime() - placedAt.getTime()) / HOUR_MS);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${hours}h (${days}d ${hours % 24}h)` : `${hours}h`;
}

async function main(): Promise<void> {
  const now = new Date();
  const cutoff = staleOrderCutoff(now);
  const prisma = getPrisma();

  try {
    const orders = await prisma.order.findMany({
      where: staleOrderWhere(cutoff),
      orderBy: { placedAt: "asc" },
      take: DEFAULT_SWEEP_LIMIT,
      select: {
        id: true,
        number: true,
        status: true,
        paymentStatus: true,
        stockState: true,
        placedAt: true,
        cancelledAt: true,
        totalAmount: true,
        customerEmail: true,
        payments: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            provider: true,
            method: true,
            status: true,
            amount: true,
            transactionRef: true,
            sessionRef: true,
            failureReason: true,
          },
        },
        items: {
          select: {
            productId: true,
            sku: true,
            productName: true,
            quantity: true,
          },
        },
      },
    });

    console.log("=".repeat(78));
    console.log("ABANDONED CHECKOUT INSPECTION — READ ONLY, NOTHING IS WRITTEN");
    console.log("=".repeat(78));
    console.log(`run at        ${now.toISOString()}`);
    console.log(`window        ${staleOrderHours()}h`);
    console.log(`cutoff        orders placed before ${cutoff.toISOString()}`);
    console.log(`candidates    ${orders.length}`);

    if (orders.length === 0) {
      console.log("");
      console.log("Nothing to report — no abandoned order is holding stock.");
      return;
    }

    // Load the stock rows once, so per-order lines can show the true shared
    // starting value rather than each order's own view of it.
    const productIds = [
      ...new Set(
        orders.flatMap((order) =>
          order.items.map((item) => item.productId).filter(Boolean),
        ),
      ),
    ] as string[];

    const stockRows = await prisma.productStock.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true,
        quantity: true,
        reserved: true,
        lowStockThreshold: true,
      },
    });
    const stockByProduct = new Map(
      stockRows.map((row) => [row.productId, row]),
    );

    // How many units each product would get back across ALL candidates.
    const totalReleaseByProduct = new Map<string, number>();
    for (const order of orders) {
      for (const item of order.items) {
        if (!item.productId) continue;
        totalReleaseByProduct.set(
          item.productId,
          (totalReleaseByProduct.get(item.productId) ?? 0) + item.quantity,
        );
      }
    }

    for (const [index, order] of orders.entries()) {
      console.log("");
      console.log("-".repeat(78));
      console.log(`[${index + 1}/${orders.length}]  ORDER ${order.number}`);
      console.log("-".repeat(78));
      console.log(`  id              ${order.id}`);
      console.log(`  customer        ${order.customerEmail}`);
      console.log(`  placed          ${order.placedAt.toISOString()}`);
      console.log(`  age             ${ageOf(order.placedAt, now)}`);
      console.log(`  total           BDT ${money(order.totalAmount)}`);
      console.log("");
      console.log("  CURRENT STATE");
      console.log(`    order.status         ${order.status}`);
      console.log(`    order.paymentStatus  ${order.paymentStatus}`);
      console.log(`    order.stockState     ${order.stockState}`);
      console.log(
        `    order.cancelledAt    ${order.cancelledAt?.toISOString() ?? "null"}`,
      );

      console.log("");
      console.log("  PAYMENT");
      if (order.payments.length === 0) {
        console.log("    (none)");
      }
      for (const payment of order.payments) {
        console.log(`    provider           ${payment.provider}`);
        console.log(`    method             ${payment.method ?? "null"}`);
        console.log(`    status             ${payment.status}`);
        console.log(`    amount             BDT ${money(payment.amount)}`);
        console.log(`    transactionRef     ${payment.transactionRef ?? "null"}`);
        console.log(`    sessionRef         ${payment.sessionRef ?? "null"}`);
        console.log(`    failureReason      ${payment.failureReason ?? "null"}`);
      }

      console.log("");
      console.log("  LINES AND STOCK IMPACT");
      let heldUnits = 0;
      for (const item of order.items) {
        heldUnits += item.productId ? item.quantity : 0;
        console.log(`    ${item.productName}`);
        console.log(`      productId        ${item.productId ?? "(deleted)"}`);
        console.log(`      sku              ${item.sku}`);
        console.log(`      quantity         ${item.quantity}`);

        if (!item.productId) {
          console.log(
            "      stock            no product row — releases nothing",
          );
          continue;
        }
        const stock = stockByProduct.get(item.productId);
        if (!stock) {
          console.log(
            "      stock            NO ProductStock ROW — releases nothing",
          );
          continue;
        }
        const available = stock.quantity - stock.reserved;
        const afterReserved = Math.max(0, stock.reserved - item.quantity);
        console.log(
          `      stock now        quantity=${stock.quantity} reserved=${stock.reserved} available=${available}`,
        );
        console.log(
          `      stock after      quantity=${stock.quantity} reserved=${afterReserved} available=${stock.quantity - afterReserved}   (quantity UNCHANGED)`,
        );
        const sharedTotal = totalReleaseByProduct.get(item.productId) ?? 0;
        if (sharedTotal !== item.quantity) {
          console.log(
            `      note             ${sharedTotal} unit(s) of this product would be released across all candidates — this row is shared`,
          );
        }
      }

      console.log("");
      console.log("  IF THE SWEEP RUNS, EXACTLY THESE VALUES CHANGE");
      console.log(`    Order.status              ${order.status} -> CANCELLED`);
      console.log(
        `    Order.paymentStatus       ${order.paymentStatus} -> CANCELLED`,
      );
      console.log(
        `    Order.stockState          ${order.stockState} -> RELEASED`,
      );
      console.log(
        `    Order.cancelledAt         ${order.cancelledAt?.toISOString() ?? "null"} -> <sweep time>`,
      );
      for (const payment of order.payments) {
        if (payment.status === "PENDING" || payment.status === "PROCESSING") {
          console.log(
            `    Payment.status            ${payment.status} -> CANCELLED   (id ${payment.id})`,
          );
          console.log(
            `    Payment.failureReason     ${payment.failureReason ?? "null"} -> "Abandoned at checkout; stock returned to inventory."`,
          );
        } else {
          console.log(
            `    Payment.status            ${payment.status} -> unchanged (only PENDING/PROCESSING are moved)`,
          );
        }
      }
      for (const item of order.items) {
        if (!item.productId) continue;
        const stock = stockByProduct.get(item.productId);
        if (!stock) continue;
        console.log(
          `    ProductStock.reserved     ${stock.reserved} -> ${Math.max(0, stock.reserved - item.quantity)}   (product ${item.productId}, -${item.quantity})`,
        );
      }
      console.log(`    NOT changed:              ProductStock.quantity, OrderItem rows,`);
      console.log(`                              Payment.amount / transactionRef / sessionRef,`);
      console.log(`                              the Order row's money fields, the customer record`);
      console.log(`    Also written:             one AuditLog row (SYSTEM / order.stale_release)`);
      console.log(`    Units returned:           ${heldUnits}`);
    }

    console.log("");
    console.log("=".repeat(78));
    console.log("TOTALS");
    console.log("=".repeat(78));
    let totalUnits = 0;
    for (const units of totalReleaseByProduct.values()) totalUnits += units;
    console.log(`  orders to cancel      ${orders.length}`);
    console.log(`  units returned        ${totalUnits}`);
    console.log(`  products affected     ${totalReleaseByProduct.size}`);
    console.log("");
    console.log("  Per product:");
    for (const [productId, units] of totalReleaseByProduct) {
      const stock = stockByProduct.get(productId);
      if (!stock) {
        console.log(`    ${productId}  (no stock row)`);
        continue;
      }
      const after = Math.max(0, stock.reserved - units);
      console.log(
        `    ${productId}  reserved ${stock.reserved} -> ${after}  (available ${stock.quantity - stock.reserved} -> ${stock.quantity - after}, of quantity ${stock.quantity})`,
      );
    }
    console.log("");
    console.log("NOTHING WAS WRITTEN. This report is read-only.");
    console.log(
      "A late gateway confirmation on a cancelled order is REFUSED, not auto-applied:",
    );
    console.log(
      "CANCELLED is terminal in lib/payments/status.ts, so the money would need a human.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("inspection failed:", error);
  process.exitCode = 1;
});
