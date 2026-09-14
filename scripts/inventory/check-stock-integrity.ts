/**
 * Inventory integrity suite (DSA-01).
 *
 *   npm run test:inventory
 *
 * Regression cover for the stock-reservation defects found in the deep audit:
 *
 *   1. Several cart lines can share one `ProductStock` row — `ProductStock`
 *      is unique per product while `CartItem` is unique per
 *      (cart, product, variant, colour). Availability must be accumulated
 *      across those lines, or one order can spend the same units twice.
 *   2. The reservation write must be additive per stock row. Writing an
 *      absolute value computed from each line's own snapshot made the second
 *      line overwrite the first, so units were sold but never reserved.
 *
 * Creates its own fixtures under `@techno-house.invalid` and removes them in
 * `finally`, exactly like `scripts/payments/check-security.ts`. It never
 * touches pre-existing products, carts, orders, or stock.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import { placeCustomerOrderForUser } from "../../lib/orders/create-order";
import {
  convertOrderStock,
  reReserveOrderStock,
  releaseOrderStock,
} from "../../lib/orders/stock-reservation";
import { updateAdminOrder } from "../../lib/orders/admin-orders";
import { applyPaymentTransition } from "../../lib/payments/service";

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

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();

  const brand = await prisma.brand.findFirst({ select: { id: true } });
  const category = await prisma.category.findFirst({ select: { id: true } });

  // A non-pickup shipping method resolves a rate only against a real area
  // (lib/cart/shipping.ts:194-197), so the cart needs one.
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

  // Narrowed into a const so the nested fixture helpers keep the non-null type.
  const shippingAreaId = shippingArea.id;

  const userIds: string[] = [];
  const productIds: string[] = [];
  let shippingMethodId: string | null = null;

  // The suite builds its own active, flat-rate shipping method rather than
  // depending on seed state — this database has ShippingMethod rows but none
  // that `listPublicShippingMethods()` returns, so checkout would fail for a
  // reason unrelated to inventory and mask the real assertions.
  const shippingMethod = await prisma.shippingMethod.create({
    data: {
      code: `inv-test-ship-${stamp}`,
      name: "Inventory Test Shipping",
      baseRateAmount: 0,
      isActive: true,
      isPickup: false,
      position: 9999,
    },
    select: { id: true, code: true },
  });
  shippingMethodId = shippingMethod.id;

  try {
    /** Builds a product with two colours and a single stock row. */
    async function makeProduct(suffix: string, quantity: number) {
      const product = await prisma.product.create({
        data: {
          slug: `inv-test-${suffix}-${stamp}`,
          sku: `INV-${suffix}-${stamp}`,
          name: `Inventory Test ${suffix}`,
          brandId: brand!.id,
          categoryId: category!.id,
          overview: [],
          priceAmount: 1000,
          currency: "BDT",
          isActive: true,
          colors: {
            create: [
              { name: "Red", hex: "#ff0000", position: 0 },
              { name: "Blue", hex: "#0000ff", position: 1 },
            ],
          },
          stock: { create: { quantity, reserved: 0, lowStockThreshold: 1 } },
        },
        select: {
          id: true,
          colors: { select: { id: true }, orderBy: { position: "asc" } },
          stock: { select: { id: true } },
        },
      });
      productIds.push(product.id);
      return product;
    }

    /** A customer with a cart holding two colour lines of one product. */
    let customerSeq = 0;
    async function makeCustomerWithCart(
      suffix: string,
      productId: string,
      colorIds: string[],
      quantities: [number, number],
    ) {
      // `User.phone` is unique, so each fixture needs its own number.
      customerSeq += 1;
      const user = await prisma.user.create({
        data: {
          email: `inv-${suffix}-${stamp}@techno-house.invalid`,
          fullName: `Inventory ${suffix}`,
          phone: `017${String(stamp).slice(-7)}${customerSeq}`,
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
          items: {
            create: [
              {
                productId,
                colorId: colorIds[0],
                quantity: quantities[0],
              },
              {
                productId,
                colorId: colorIds[1],
                quantity: quantities[1],
              },
            ],
          },
        },
      });
      return user.id;
    }

    const contact = {
      fullName: "Inventory Test",
      phone: "01710000000",
      email: `inv-contact-${stamp}@techno-house.invalid`,
      addressLine: "12 Test Road, Dhaka",
      notes: "",
      billingAddress: "",
      paymentMethodId: "cod",
    };

    // --- Case 1: two colour lines must not both spend the same units --------
    // Stock 5. Red 5 + Blue 5 = 10 requested. Must be rejected.
    const oversell = await makeProduct("oversell", 5);
    const oversellUser = await makeCustomerWithCart(
      "a",
      oversell.id,
      oversell.colors.map((c) => c.id),
      [5, 5],
    );

    const oversellResult = await placeCustomerOrderForUser(
      oversellUser,
      contact,
    );
    // Assert the REASON, not merely that it failed: a fixture problem would
    // also produce `ok: false` and silently turn this into a false pass.
    check(
      "two colour lines cannot oversell one stock row",
      !oversellResult.ok && /enough stock/i.test(oversellResult.reason),
      oversellResult.ok
        ? "the order was accepted for 10 units against stock of 5"
        : `rejected for the wrong reason: ${oversellResult.reason}`,
    );

    const oversellStock = await prisma.productStock.findUnique({
      where: { id: oversell.stock!.id },
      select: { quantity: true, reserved: true },
    });
    check(
      "a rejected order reserves nothing",
      oversellStock?.reserved === 0,
      `reserved=${oversellStock?.reserved}`,
    );

    // --- Case 2: reservations across lines must be additive -----------------
    // Stock 100. Red 2 + Blue 3 = 5. Must reserve exactly 5, not 3.
    const additive = await makeProduct("additive", 100);
    const additiveUser = await makeCustomerWithCart(
      "b",
      additive.id,
      additive.colors.map((c) => c.id),
      [2, 3],
    );

    const additiveResult = await placeCustomerOrderForUser(
      additiveUser,
      contact,
    );
    check(
      "an in-stock multi-colour order is accepted",
      additiveResult.ok,
      additiveResult.ok ? undefined : additiveResult.reason,
    );

    const additiveStock = await prisma.productStock.findUnique({
      where: { id: additive.stock!.id },
      select: { quantity: true, reserved: true },
    });
    check(
      "reservation is the sum of every line sharing the stock row",
      additiveStock?.reserved === 5,
      `expected reserved=5, got ${additiveStock?.reserved}`,
    );
    check(
      "reserved never exceeds quantity",
      (additiveStock?.reserved ?? 0) <= (additiveStock?.quantity ?? 0),
      `reserved=${additiveStock?.reserved} quantity=${additiveStock?.quantity}`,
    );

    // --- Case 3: exact-fit multi-line order is still allowed ----------------
    // Stock 5. Red 2 + Blue 3 = 5. Must succeed and leave nothing available.
    const exact = await makeProduct("exact", 5);
    const exactUser = await makeCustomerWithCart(
      "c",
      exact.id,
      exact.colors.map((c) => c.id),
      [2, 3],
    );
    const exactResult = await placeCustomerOrderForUser(exactUser, contact);
    check(
      "an order consuming exactly the available stock is accepted",
      exactResult.ok,
      exactResult.ok ? undefined : exactResult.reason,
    );
    const exactStock = await prisma.productStock.findUnique({
      where: { id: exact.stock!.id },
      select: { quantity: true, reserved: true },
    });
    check(
      "exact-fit order leaves zero available",
      exactStock?.reserved === 5 && exactStock?.quantity === 5,
      `reserved=${exactStock?.reserved} quantity=${exactStock?.quantity}`,
    );

    // --- Case 4: reservation lifecycle (DSA-02) ----------------------------
    // Stock 20, order of 4+6=10. Release must return all 10, exactly once,
    // and a re-reserve must take them back.
    const cycle = await makeProduct("cycle", 20);
    const cycleUser = await makeCustomerWithCart(
      "d",
      cycle.id,
      cycle.colors.map((c) => c.id),
      [4, 6],
    );
    const cycleResult = await placeCustomerOrderForUser(cycleUser, contact);
    check(
      "lifecycle fixture order placed",
      cycleResult.ok,
      cycleResult.ok ? undefined : cycleResult.reason,
    );
    const cycleOrder = await prisma.order.findFirst({
      where: { userId: cycleUser },
      select: { id: true, stockState: true },
    });
    check(
      "a new order starts in RESERVED",
      cycleOrder?.stockState === "RESERVED",
      `stockState=${cycleOrder?.stockState}`,
    );

    async function reservedNow(): Promise<number> {
      const row = await prisma.productStock.findUnique({
        where: { id: cycle.stock!.id },
        select: { reserved: true },
      });
      return row?.reserved ?? -1;
    }
    check("reserved after placing = 10", (await reservedNow()) === 10);

    await prisma.$transaction(async (tx) => {
      await releaseOrderStock(tx, cycleOrder!.id);
    });
    check("release returns every unit", (await reservedNow()) === 0);

    // The whole point of the stockState claim: a second release must be inert.
    await prisma.$transaction(async (tx) => {
      await releaseOrderStock(tx, cycleOrder!.id);
    });
    check(
      "a second release is a no-op (no double decrement)",
      (await reservedNow()) === 0,
    );

    await prisma.$transaction(async (tx) => {
      await reReserveOrderStock(tx, cycleOrder!.id);
    });
    check("reopening a cancelled order re-reserves", (await reservedNow()) === 10);

    // --- Case 5: delivery converts reservation into a real decrement --------
    await prisma.$transaction(async (tx) => {
      await convertOrderStock(tx, cycleOrder!.id);
    });
    const delivered = await prisma.productStock.findUnique({
      where: { id: cycle.stock!.id },
      select: { quantity: true, reserved: true },
    });
    check(
      "delivery decrements quantity and clears the reservation",
      delivered?.quantity === 10 && delivered?.reserved === 0,
      `quantity=${delivered?.quantity} reserved=${delivered?.reserved}`,
    );
    await prisma.$transaction(async (tx) => {
      await convertOrderStock(tx, cycleOrder!.id);
    });
    const deliveredTwice = await prisma.productStock.findUnique({
      where: { id: cycle.stock!.id },
      select: { quantity: true },
    });
    check(
      "a second delivery conversion is a no-op",
      deliveredTwice?.quantity === 10,
      `quantity=${deliveredTwice?.quantity}`,
    );


    // --- Case 6: the real admin cancel path releases stock ------------------
    const cancelStock = await makeProduct("cancel", 30);
    const cancelUser = await makeCustomerWithCart(
      "e",
      cancelStock.id,
      cancelStock.colors.map((c) => c.id),
      [3, 4],
    );
    const cancelPlaced = await placeCustomerOrderForUser(cancelUser, contact);
    check(
      "cancel fixture order placed",
      cancelPlaced.ok,
      cancelPlaced.ok ? undefined : cancelPlaced.reason,
    );
    const cancelOrder = await prisma.order.findFirst({
      where: { userId: cancelUser },
      select: { id: true },
    });
    const beforeCancel = await prisma.productStock.findUnique({
      where: { id: cancelStock.stock!.id },
      select: { reserved: true },
    });
    check("reserved before cancel = 7", beforeCancel?.reserved === 7);

    await updateAdminOrder({
      id: cancelOrder!.id,
      fulfillmentStatus: "cancelled",
      trackingCode: "",
      staffNotes: "",
    });
    const afterCancel = await prisma.productStock.findUnique({
      where: { id: cancelStock.stock!.id },
      select: { reserved: true },
    });
    check(
      "cancelling an order through the admin path releases its stock",
      afterCancel?.reserved === 0,
      `reserved=${afterCancel?.reserved}`,
    );

    // --- Case 7: a failed payment releases stock ----------------------------
    const failStock = await makeProduct("fail", 30);
    const failUser = await makeCustomerWithCart(
      "f",
      failStock.id,
      failStock.colors.map((c) => c.id),
      [5, 5],
    );
    const failPlaced = await placeCustomerOrderForUser(failUser, contact);
    check(
      "failed-payment fixture order placed",
      failPlaced.ok,
      failPlaced.ok ? undefined : failPlaced.reason,
    );
    const failOrder = await prisma.order.findFirst({
      where: { userId: failUser },
      select: { id: true, payments: { select: { id: true } } },
    });
    const beforeFail = await prisma.productStock.findUnique({
      where: { id: failStock.stock!.id },
      select: { reserved: true },
    });
    check("reserved before payment failure = 10", beforeFail?.reserved === 10);

    await applyPaymentTransition({
      paymentId: failOrder!.payments[0]!.id,
      next: "FAILED",
      failureReason: "inventory suite",
    });
    const afterFail = await prisma.productStock.findUnique({
      where: { id: failStock.stock!.id },
      select: { reserved: true },
    });
    check(
      "a failed payment releases the order's stock",
      afterFail?.reserved === 0,
      `reserved=${afterFail?.reserved}`,
    );


    // --- F17-01: the admin VAT rate actually reaches an order ---------------
    // The arithmetic is covered by `npm run test:tax`; this proves the wiring,
    // which is the part that was missing for months.
    const previousOps = await prisma.storeOperationsSettings.findUnique({
      where: { id: "singleton" },
      select: { vatRateBasisPoints: true, taxIncludedInPrice: true },
    });
    try {
      await prisma.storeOperationsSettings.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          vatRateBasisPoints: 500,
          taxIncludedInPrice: false,
        },
        update: { vatRateBasisPoints: 500, taxIncludedInPrice: false },
      });

      const taxed = await makeProduct("taxed", 50);
      const taxedUser = await makeCustomerWithCart(
        "t",
        taxed.id,
        taxed.colors.map((c) => c.id),
        [1, 1],
      );
      const taxedOrder = await placeCustomerOrderForUser(taxedUser, contact);
      check(
        "an order places with VAT configured",
        taxedOrder.ok,
        taxedOrder.ok ? undefined : taxedOrder.reason,
      );
      const row = await prisma.order.findFirst({
        where: { userId: taxedUser },
        select: {
          subtotalAmount: true,
          discountAmount: true,
          shippingAmount: true,
          taxAmount: true,
          totalAmount: true,
        },
      });
      // 2 units at 1000 = 2000 subtotal, 5% exclusive = 100 tax.
      check(
        "a 5% exclusive VAT rate is recorded on the order",
        row?.taxAmount === 100,
        `subtotal=${row?.subtotalAmount} taxAmount=${row?.taxAmount}`,
      );
      check(
        "the order total includes the VAT",
        row != null &&
          row.totalAmount ===
            row.subtotalAmount -
              row.discountAmount +
              row.shippingAmount +
              row.taxAmount,
        `total=${row?.totalAmount} parts=${row?.subtotalAmount}-${row?.discountAmount}+${row?.shippingAmount}+${row?.taxAmount}`,
      );

      // Inclusive mode: the tax is recorded but must NOT inflate the total.
      await prisma.storeOperationsSettings.update({
        where: { id: "singleton" },
        data: { taxIncludedInPrice: true },
      });
      const incProduct = await makeProduct("taxinc", 50);
      const incUser = await makeCustomerWithCart(
        "u",
        incProduct.id,
        incProduct.colors.map((c) => c.id),
        [1, 1],
      );
      const incOrder = await placeCustomerOrderForUser(incUser, contact);
      check(
        "an order places with inclusive VAT",
        incOrder.ok,
        incOrder.ok ? undefined : incOrder.reason,
      );
      const incRow = await prisma.order.findFirst({
        where: { userId: incUser },
        select: {
          subtotalAmount: true,
          discountAmount: true,
          shippingAmount: true,
          taxAmount: true,
          totalAmount: true,
        },
      });
      check(
        "inclusive VAT is recorded on the order",
        incRow != null && incRow.taxAmount > 0,
        `taxAmount=${incRow?.taxAmount}`,
      );
      check(
        "inclusive VAT is NOT added to the total",
        incRow != null &&
          incRow.totalAmount ===
            incRow.subtotalAmount -
              incRow.discountAmount +
              incRow.shippingAmount,
        `total=${incRow?.totalAmount} expected=${
          (incRow?.subtotalAmount ?? 0) -
          (incRow?.discountAmount ?? 0) +
          (incRow?.shippingAmount ?? 0)
        } — every order would be overcharged`,
      );
    } finally {
      // Shared singleton: restore whatever the operator had configured.
      if (previousOps) {
        await prisma.storeOperationsSettings.update({
          where: { id: "singleton" },
          data: previousOps,
        });
      } else {
        await prisma.storeOperationsSettings.deleteMany({
          where: { id: "singleton" },
        });
      }
    }


    // --- DSA-14: per-customer coupon cap -----------------------------------
    // `usageLimit` caps the TOTAL across everyone; before this there was no way
    // to stop one account reusing a coupon indefinitely. The capability is
    // opt-in: `perUserLimit: null` must behave exactly as it always did.
    const couponCodes: string[] = [];
    try {
      const cappedCode = `INVCAP${stamp}`;
      const capped = await prisma.coupon.create({
        data: {
          code: cappedCode,
          kind: "FIXED",
          value: 50,
          isActive: true,
          perUserLimit: 1,
        },
        select: { id: true, code: true },
      });
      couponCodes.push(capped.code);

      const reuseProduct = await makeProduct("coupon", 80);
      const reuseUser = await makeCustomerWithCart(
        "v",
        reuseProduct.id,
        reuseProduct.colors.map((c) => c.id),
        [1, 1],
      );
      await prisma.cart.updateMany({
        where: { userId: reuseUser },
        data: { couponCode: capped.code },
      });
      const firstUse = await placeCustomerOrderForUser(reuseUser, contact);
      check(
        "the first use of a capped coupon succeeds",
        firstUse.ok,
        firstUse.ok ? undefined : firstUse.reason,
      );
      const redemptions = await prisma.couponRedemption.count({
        where: { couponId: capped.id },
      });
      check(
        "the redemption is recorded",
        redemptions === 1,
        `redemptions=${redemptions}`,
      );

      // Same customer, second order, same coupon.
      await prisma.cart.create({
        data: {
          userId: reuseUser,
          shippingMethodId: shippingMethod.id,
          shippingAreaId,
          couponCode: capped.code,
          items: {
            create: [
              {
                productId: reuseProduct.id,
                colorId: reuseProduct.colors[0]!.id,
                quantity: 1,
              },
            ],
          },
        },
      });
      const secondUse = await placeCustomerOrderForUser(reuseUser, contact);
      check(
        "the same customer cannot reuse a capped coupon",
        !secondUse.ok,
        secondUse.ok ? "the per-customer cap did not hold" : undefined,
      );
      check(
        "the refusal explains why",
        !secondUse.ok && /already used this coupon/i.test(secondUse.reason),
        secondUse.ok ? undefined : `reason: ${secondUse.reason}`,
      );

      // A DIFFERENT customer is unaffected by someone else's cap.
      const otherUser = await makeCustomerWithCart(
        "w",
        reuseProduct.id,
        reuseProduct.colors.map((c) => c.id),
        [1, 1],
      );
      await prisma.cart.updateMany({
        where: { userId: otherUser },
        data: { couponCode: capped.code },
      });
      const otherUse = await placeCustomerOrderForUser(otherUser, contact);
      check(
        "a different customer can still use the coupon",
        otherUse.ok,
        otherUse.ok ? undefined : otherUse.reason,
      );

      // Opt-in: an uncapped coupon behaves exactly as before.
      const openCode = `INVOPEN${stamp}`;
      const open = await prisma.coupon.create({
        data: {
          code: openCode,
          kind: "FIXED",
          value: 50,
          isActive: true,
          perUserLimit: null,
        },
        select: { code: true },
      });
      couponCodes.push(open.code);
      const openProduct = await makeProduct("couponopen", 80);
      const openUser = await makeCustomerWithCart(
        "x",
        openProduct.id,
        openProduct.colors.map((c) => c.id),
        [1, 1],
      );
      await prisma.cart.updateMany({
        where: { userId: openUser },
        data: { couponCode: open.code },
      });
      const openFirst = await placeCustomerOrderForUser(openUser, contact);
      await prisma.cart.create({
        data: {
          userId: openUser,
          shippingMethodId: shippingMethod.id,
          shippingAreaId,
          couponCode: open.code,
          items: {
            create: [
              {
                productId: openProduct.id,
                colorId: openProduct.colors[0]!.id,
                quantity: 1,
              },
            ],
          },
        },
      });
      const openSecond = await placeCustomerOrderForUser(openUser, contact);
      check(
        "an uncapped coupon is still reusable by the same customer",
        openFirst.ok && openSecond.ok,
        `first=${openFirst.ok} second=${openSecond.ok}`,
      );
    } finally {
      await prisma.couponRedemption.deleteMany({
        where: { coupon: { code: { in: couponCodes } } },
      });
      await prisma.order.updateMany({
        where: { couponCode: { in: couponCodes } },
        data: { couponId: null, couponCode: null },
      });
      await prisma.coupon.deleteMany({ where: { code: { in: couponCodes } } });
    }

  } finally {
    // Scoped strictly to this run's fixtures.
    await prisma.orderItem.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId: { in: userIds } } },
    });
    await prisma.order.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.cartItem.deleteMany({
      where: { cart: { userId: { in: userIds } } },
    });
    await prisma.cart.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    // Product delete cascades to ProductColor and ProductStock.
    await prisma.product.deleteMany({ where: { id: { in: productIds } } });
    if (shippingMethodId) {
      await prisma.shippingMethod.deleteMany({
        where: { id: shippingMethodId },
      });
    }
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`inventory integrity failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${passes} inventory integrity checks`);
}

main().catch((error) => {
  console.error("inventory integrity crashed:", error);
  process.exitCode = 1;
});
