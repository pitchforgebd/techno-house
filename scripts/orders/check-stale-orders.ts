/**
 * Abandoned-checkout stock release suite.
 *
 *   npm run test:staleorders
 *
 * `create-order` reserves stock before the customer reaches the gateway, and
 * until `lib/orders/stale-orders.ts` existed nothing released it when the
 * customer never came back. The reservation was permanent, so every abandoned
 * checkout lowered a product's availability for good.
 *
 * The properties that matter here are almost all about what the sweep must NOT
 * touch. Releasing stock is easy; releasing stock from an order somebody is
 * still paying for, or from a cash-on-delivery order that is legitimately
 * unpaid for three days, is how an inventory fix turns into cancelled real
 * orders.
 *
 * ## A deliberate limit on this suite
 *
 * It never calls `sweepStaleOrders` against the database. The sweep acts on
 * every qualifying order it finds, and a test run must not be able to cancel
 * orders that were already sitting in this database before the suite started.
 * `releaseStaleOrder` — where all of the locking, re-checking and state
 * movement lives — is exercised directly on fixtures this suite created, and
 * `findStaleOrders` is checked by membership rather than by count, for the
 * same reason.
 *
 * Fixtures live under `@techno-house.invalid` and are removed in `finally`.
 */
import { config as loadEnvFiles } from "dotenv";
import { readFileSync } from "node:fs";
import { getPrisma } from "../../lib/db/prisma";
import { placeCustomerOrderForUser } from "../../lib/orders/create-order";
import {
  DEFAULT_STALE_ORDER_HOURS,
  findStaleOrders,
  releaseStaleOrder,
  staleOrderCutoff,
  staleOrderHours,
} from "../../lib/orders/stale-orders";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let failures = 0;
let passes = 0;

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passes += 1;
    return;
  }
  failures += 1;
  console.error(`fail ${label}${detail ? ` — ${detail}` : ""}`);
}

const HOUR_MS = 60 * 60 * 1000;

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();

  // --- The window, which is the whole safety margin -----------------------
  check(
    "the default window is 24 hours",
    staleOrderHours(undefined) === DEFAULT_STALE_ORDER_HOURS &&
      DEFAULT_STALE_ORDER_HOURS === 24,
    `got ${staleOrderHours(undefined)}`,
  );
  check("a configured window is honoured", staleOrderHours("72") === 72);
  check(
    "a non-numeric window falls back to the default",
    staleOrderHours("soon") === DEFAULT_STALE_ORDER_HOURS,
  );
  // Each of these would be a disaster if clamped into range instead: "0"
  // clamped to 1 would sweep orders an hour old.
  check(
    "a zero window falls back rather than clamping to one hour",
    staleOrderHours("0") === DEFAULT_STALE_ORDER_HOURS,
    "a typo would cancel checkouts that are minutes old",
  );
  check(
    "a negative window falls back",
    staleOrderHours("-5") === DEFAULT_STALE_ORDER_HOURS,
  );
  check(
    "a fractional window falls back",
    staleOrderHours("1.5") === DEFAULT_STALE_ORDER_HOURS,
  );
  check(
    "an absurdly long window falls back",
    staleOrderHours("100000") === DEFAULT_STALE_ORDER_HOURS,
  );
  const now = new Date();
  const cutoff = staleOrderCutoff(now);
  check(
    "the cutoff is one window behind now",
    Math.abs(now.getTime() - cutoff.getTime() - 24 * HOUR_MS) < 1000,
    `cutoff=${cutoff.toISOString()}`,
  );

  const brand = await prisma.brand.findFirst({ select: { id: true } });
  const category = await prisma.category.findFirst({ select: { id: true } });
  const shippingArea = await prisma.shippingArea.findFirst({
    select: { id: true },
  });
  if (!brand || !category || !shippingArea) {
    console.error(
      "fail fixtures — need at least one Brand, Category and ShippingArea. Seed the database first.",
    );
    process.exitCode = 1;
    return;
  }
  const brandId = brand.id;
  const categoryId = category.id;
  const shippingAreaId = shippingArea.id;

  const userIds: string[] = [];
  const productIds: string[] = [];
  const orderIds: string[] = [];

  const shippingMethod = await prisma.shippingMethod.create({
    data: {
      code: `stale-test-ship-${stamp}`,
      name: "Stale Order Test Shipping",
      baseRateAmount: 0,
      isActive: true,
      isPickup: false,
      position: 9999,
    },
    select: { id: true },
  });

  try {
    let seq = 0;

    /**
     * One placed order holding `quantity` units, plus the stock row behind it.
     *
     * The order is placed through the real checkout so the reservation is real.
     * `provider` then rewrites the payment row: a hosted gateway cannot be
     * driven from a script without live credentials, and what is under test is
     * the sweep's selection, not SSLCommerz. `ageHours` back-dates `placedAt`
     * on this suite's own fixture.
     */
    async function makeOrder(options: {
      suffix: string;
      quantity: number;
      provider: "cod" | "sslcommerz";
      ageHours: number;
    }) {
      seq += 1;
      const product = await prisma.product.create({
        data: {
          slug: `stale-test-${options.suffix}-${stamp}`,
          sku: `STALE-${options.suffix}-${stamp}`,
          name: `Stale Test ${options.suffix}`,
          brandId,
          categoryId,
          overview: [],
          priceAmount: 1000,
          currency: "BDT",
          isActive: true,
          stock: {
            create: { quantity: 10, reserved: 0, lowStockThreshold: 1 },
          },
        },
        select: { id: true, stock: { select: { id: true } } },
      });
      productIds.push(product.id);

      const user = await prisma.user.create({
        data: {
          email: `stale-${options.suffix}-${stamp}@techno-house.invalid`,
          fullName: `Stale ${options.suffix}`,
          phone: `017${String(stamp).slice(-7)}${seq}`,
          status: "ACTIVE",
        },
        select: { id: true },
      });
      userIds.push(user.id);

      await prisma.cart.create({
        data: {
          userId: user.id,
          shippingMethodId: shippingMethod.id,
          shippingAreaId,
          items: { create: [{ productId: product.id, quantity: options.quantity }] },
        },
      });

      const placed = await placeCustomerOrderForUser(user.id, {
        fullName: "Stale Test",
        phone: "01710000000",
        email: `stale-contact-${options.suffix}-${stamp}@techno-house.invalid`,
        addressLine: "12 Test Road, Dhaka",
        notes: "",
        billingAddress: "",
        paymentMethodId: "cod",
      });
      if (!placed.ok) {
        throw new Error(
          `fixture order (${options.suffix}) was refused: ${placed.reason}`,
        );
      }

      // `placeCustomerOrderForUser` returns a customer-facing view, which
      // carries the public order number but not the row id.
      const row = await prisma.order.findUnique({
        where: { number: placed.order.number },
        select: { id: true },
      });
      if (!row) {
        throw new Error(
          `fixture order (${options.suffix}) vanished after placement`,
        );
      }
      const orderId = row.id;
      orderIds.push(orderId);
      if (options.provider !== "cod") {
        await prisma.payment.updateMany({
          where: { orderId },
          data: { provider: options.provider, method: options.provider },
        });
      }
      await prisma.order.update({
        where: { id: orderId },
        data: {
          placedAt: new Date(now.getTime() - options.ageHours * HOUR_MS),
        },
      });

      return { orderId, productId: product.id, stockId: product.stock!.id };
    }

    async function reservedFor(stockId: string): Promise<number> {
      const row = await prisma.productStock.findUnique({
        where: { id: stockId },
        select: { reserved: true },
      });
      return row?.reserved ?? -1;
    }

    async function isCandidate(orderId: string): Promise<boolean> {
      const found = await findStaleOrders(prisma, { cutoff, limit: 500 });
      return found.some((order) => order.id === orderId);
    }

    // --- The case the module exists for -------------------------------------
    const abandoned = await makeOrder({
      suffix: "abandoned",
      quantity: 3,
      provider: "sslcommerz",
      ageHours: 48,
    });
    check(
      "an abandoned hosted-gateway order is a candidate",
      await isCandidate(abandoned.orderId),
      "its stock would stay reserved forever",
    );
    check(
      "it is holding its units before the sweep",
      (await reservedFor(abandoned.stockId)) === 3,
      `reserved=${await reservedFor(abandoned.stockId)}`,
    );

    const released = await releaseStaleOrder(prisma, abandoned.orderId, cutoff);
    check("releasing it reports success", released.released);
    check(
      "the units go back to available stock",
      (await reservedFor(abandoned.stockId)) === 0,
      `reserved=${await reservedFor(abandoned.stockId)}`,
    );

    const afterRelease = await prisma.order.findUnique({
      where: { id: abandoned.orderId },
      select: {
        status: true,
        paymentStatus: true,
        stockState: true,
        cancelledAt: true,
        payments: { select: { status: true } },
      },
    });
    check(
      "the order is cancelled, not left pending with no stock",
      afterRelease?.status === "CANCELLED",
      `status=${afterRelease?.status}`,
    );
    check(
      "its stock state records the release",
      afterRelease?.stockState === "RELEASED",
      `stockState=${afterRelease?.stockState}`,
    );
    check(
      "the order payment status is cancelled",
      afterRelease?.paymentStatus === "CANCELLED",
      `paymentStatus=${afterRelease?.paymentStatus}`,
    );
    check(
      "the payment row is cancelled too",
      afterRelease?.payments.every((p) => p.status === "CANCELLED") === true,
      `payments=${JSON.stringify(afterRelease?.payments)}`,
    );
    check("a cancellation time is recorded", afterRelease?.cancelledAt != null);

    // A terminal payment status is what stops a late webhook quietly marking a
    // stock-released order paid. Assert the table itself, not just this row.
    const statusSrc = readFileSync("lib/payments/status.ts", "utf-8");
    check(
      "CANCELLED is terminal, so a late payment cannot revive a swept order",
      /CANCELLED: \[\]/.test(statusSrc),
      "a webhook could mark a stock-released order paid",
    );

    // Running it twice must not hand the units back twice.
    const again = await releaseStaleOrder(prisma, abandoned.orderId, cutoff);
    check(
      "a second release is refused",
      !again.released,
      "the same order was released twice",
    );
    check(
      "and the stock is unchanged by the second attempt",
      (await reservedFor(abandoned.stockId)) === 0,
      `reserved=${await reservedFor(abandoned.stockId)}`,
    );

    const audit = await prisma.auditLog.findFirst({
      where: { entityType: "Order", entityId: abandoned.orderId },
      select: { action: true, actorType: true },
    });
    check(
      "the release is recorded in the audit log",
      audit?.action === "order.stale_release" && audit.actorType === "SYSTEM",
      `audit=${JSON.stringify(audit)}`,
    );

    // --- Everything it must leave alone --------------------------------------
    // The most important check in this file. A COD order is *supposed* to sit
    // unpaid for days.
    const cod = await makeOrder({
      suffix: "cod",
      quantity: 2,
      provider: "cod",
      ageHours: 96,
    });
    check(
      "a four-day-old cash-on-delivery order is NOT a candidate",
      !(await isCandidate(cod.orderId)),
      "the sweep would cancel orders that are waiting for the rider",
    );
    check(
      "and it still holds its units",
      (await reservedFor(cod.stockId)) === 2,
      `reserved=${await reservedFor(cod.stockId)}`,
    );

    const recent = await makeOrder({
      suffix: "recent",
      quantity: 1,
      provider: "sslcommerz",
      ageHours: 2,
    });
    check(
      "an order placed two hours ago is NOT a candidate",
      !(await isCandidate(recent.orderId)),
      "a customer still at the gateway would lose their order",
    );

    // The state a customer who is ACTUALLY at the gateway right now is in.
    // `startHostedCheckoutForOrder` moves the payment to PROCESSING when the
    // hosted session is created, so the case above — a PENDING payment — is not
    // the one that matters most. Checked separately because the window is the
    // only thing protecting it.
    const atGateway = await makeOrder({
      suffix: "atgateway",
      quantity: 1,
      provider: "sslcommerz",
      ageHours: 1,
    });
    await prisma.payment.updateMany({
      where: { orderId: atGateway.orderId },
      data: { status: "PROCESSING", sessionRef: `stale-session-${stamp}` },
    });
    await prisma.order.update({
      where: { id: atGateway.orderId },
      data: { paymentStatus: "PROCESSING" },
    });
    check(
      "a customer mid-payment at the gateway is NOT a candidate",
      !(await isCandidate(atGateway.orderId)),
      "the sweep would cancel an order while its customer is paying for it",
    );
    check(
      "and releasing it directly is refused",
      !(await releaseStaleOrder(prisma, atGateway.orderId, cutoff)).released,
    );
    check(
      "it still holds its unit",
      (await reservedFor(atGateway.stockId)) === 1,
      `reserved=${await reservedFor(atGateway.stockId)}`,
    );

    // The deliberate other half: once the window has passed, a PROCESSING
    // payment IS swept. A hosted gateway session cannot still be live a day
    // later, so "PROCESSING and 48h old" means the customer left, not that
    // they are still deciding. Asserted so the behaviour is a decision on
    // record rather than an accident of the predicate.
    const abandonedMidPayment = await makeOrder({
      suffix: "abandonedmid",
      quantity: 1,
      provider: "sslcommerz",
      ageHours: 48,
    });
    await prisma.payment.updateMany({
      where: { orderId: abandonedMidPayment.orderId },
      data: { status: "PROCESSING", sessionRef: `stale-session-old-${stamp}` },
    });
    await prisma.order.update({
      where: { id: abandonedMidPayment.orderId },
      data: { paymentStatus: "PROCESSING" },
    });
    check(
      "a PROCESSING payment older than the window IS a candidate",
      await isCandidate(abandonedMidPayment.orderId),
      "an abandoned gateway redirect would hold its stock forever",
    );

    const paid = await makeOrder({
      suffix: "paid",
      quantity: 1,
      provider: "sslcommerz",
      ageHours: 48,
    });
    await prisma.payment.updateMany({
      where: { orderId: paid.orderId },
      data: { status: "PAID", transactionRef: `stale-paid-${stamp}` },
    });
    check(
      "an old but PAID order is NOT a candidate",
      !(await isCandidate(paid.orderId)),
      "paid goods would be returned to the shelf",
    );

    const confirmed = await makeOrder({
      suffix: "confirmed",
      quantity: 1,
      provider: "sslcommerz",
      ageHours: 48,
    });
    await prisma.order.update({
      where: { id: confirmed.orderId },
      data: { status: "PROCESSING" },
    });
    check(
      "an order staff have already confirmed is NOT a candidate",
      !(await isCandidate(confirmed.orderId)),
      "a human decision would be overridden by a scheduled job",
    );

    // Even asked directly, a non-candidate must be refused — the re-check under
    // the lock is what protects against the order moving mid-sweep.
    const refused = await releaseStaleOrder(prisma, cod.orderId, cutoff);
    check(
      "releasing a non-candidate directly is refused",
      !refused.released,
      "the re-check under the lock is not load-bearing",
    );
    check(
      "the refused order kept its units",
      (await reservedFor(cod.stockId)) === 2,
    );

    // --- The scheduler entry point ------------------------------------------
    const routeSrc = readFileSync(
      "app/api/internal/sweep-stale-orders/route.ts",
      "utf-8",
    );
    check(
      "the sweep endpoint is absent unless a token is configured",
      /if \(!expected\)[\s\S]{0,120}status: 404/.test(routeSrc),
      "an unconfigured deployment exposes the endpoint",
    );
    check(
      "the token is compared in constant time",
      /timingSafeEqual/.test(routeSrc) && !/presented === expected/.test(routeSrc),
      "string comparison leaks the token prefix through timing",
    );
    check(
      "the endpoint is POST-only",
      /export async function POST/.test(routeSrc) &&
        !/export async function GET/.test(routeSrc),
      "a GET-able mutation gets fired by prefetchers and scanners",
    );

    // --- The sweeper script must not write unless told to --------------------
    const scriptSrc = readFileSync(
      "scripts/orders/sweep-stale-orders.ts",
      "utf-8",
    );
    check(
      "the sweep script requires an explicit --apply",
      /includes\("--apply"\)/.test(scriptSrc) && /if \(!apply\)/.test(scriptSrc),
      "running the script by name would cancel orders",
    );
  } finally {
    // Scoped to this suite's own orders. A blanket delete on the action would
    // remove real release records from a database that had them.
    await prisma.auditLog.deleteMany({
      where: { entityType: "Order", entityId: { in: orderIds } },
    });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.orderItem.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.productStock.deleteMany({
      where: { productId: { in: productIds } },
    });
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.shippingMethod.delete({ where: { id: shippingMethod.id } });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`stale orders failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${passes} stale-order checks`);
}

main().catch((error) => {
  console.error("stale-order suite crashed:", error);
  process.exitCode = 1;
});
