/**
 * Order ID identity suite.
 *
 *   npm run test:orderid
 *
 * `Order.number` is the canonical customer-facing Order ID. It is printed on
 * invoices, sent to SSLCommerz as `tran_id`, to bKash as
 * `merchantInvoiceNumber` and to Nagad as `orderId`, quoted in support threads,
 * and used in every customer-facing URL. Two properties have to hold for that
 * to mean anything:
 *
 *   1. **New numbers are digits only**, enforced by the database rather than by
 *      whatever the generator happens to return today.
 *   2. **Legacy `TH-YYYYMMDD-XXXXXXXX` numbers keep working forever.** They are
 *      already recorded at the gateways and on paper, so they cannot be
 *      renumbered — which means "numeric only" must be a rule about what is
 *      *written*, never about what can be *read*.
 *
 * The second is the easier one to break while fixing the first, so most of what
 * follows guards it.
 *
 * Fixtures live under `@techno-house.invalid` and are removed in `finally`.
 */
import { config as loadEnvFiles } from "dotenv";
import { readFileSync } from "node:fs";
import { getPrisma } from "../../lib/db/prisma";
import {
  isLegacyOrderNumber,
  isNumericOrderNumber,
  isStorableOrderNumber,
  nextOrderNumber,
} from "../../lib/orders/order-number";

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
  const createdOrderIds: string[] = [];

  try {
    // --- The predicates ------------------------------------------------------
    check("a sequential number is numeric", isNumericOrderNumber("100187"));
    check("a long numeric number is numeric", isNumericOrderNumber("202609130001"));
    check("a legacy number is NOT numeric", !isNumericOrderNumber("TH-20260905-8366F196"));
    check("a prefixed number is NOT numeric", !isNumericOrderNumber("ORD-1"));
    check("a signed number is NOT numeric", !isNumericOrderNumber("-1"));
    check("a decimal is NOT numeric", !isNumericOrderNumber("1.5"));
    check("an empty string is NOT numeric", !isNumericOrderNumber(""));
    check("whitespace is NOT numeric", !isNumericOrderNumber(" 100187 "));

    check("a legacy number is recognised", isLegacyOrderNumber("TH-20260905-8366F196"));
    check("a numeric number is not legacy", !isLegacyOrderNumber("100187"));

    // Both shapes are storable; nothing else is.
    check("numeric is storable", isStorableOrderNumber("100187"));
    check("legacy is storable", isStorableOrderNumber("TH-20260905-8366F196"));
    check("an arbitrary format is NOT storable", !isStorableOrderNumber("ORD-BAD-999"));

    // --- The generator -------------------------------------------------------
    // Drawn through a real transaction, then rolled back so the suite does not
    // consume production order numbers beyond the sequence bump nextval makes
    // unavoidable (it does not roll back, by design — see order-number.ts).
    let generated = "";
    await prisma
      .$transaction(async (tx) => {
        generated = await nextOrderNumber(tx);
        throw new Error("rollback");
      })
      .catch((error) => {
        if (!(error instanceof Error) || error.message !== "rollback") {
          throw error;
        }
      });
    check(
      "the generator produces a numeric number",
      isNumericOrderNumber(generated),
      `got ${JSON.stringify(generated)}`,
    );
    check(
      "the generated number carries no prefix or separator",
      !generated.includes("-") && !/[A-Za-z]/.test(generated),
      `got ${JSON.stringify(generated)}`,
    );

    // Two draws must never collide. `nextval` is the concurrency guarantee;
    // this asserts it rather than trusting the comment.
    const draws = await Promise.all(
      Array.from({ length: 5 }, () =>
        prisma
          .$transaction(async (tx) => {
            const value = await nextOrderNumber(tx);
            throw Object.assign(new Error("rollback"), { value });
          })
          .catch((error: { value?: string; message?: string }) => {
            if (error.message !== "rollback") {
              throw error;
            }
            return error.value ?? "";
          }),
      ),
    );
    check(
      "five concurrent draws produce five distinct numbers",
      new Set(draws).size === 5 && draws.every(isNumericOrderNumber),
      `got ${JSON.stringify(draws)}`,
    );

    // --- The database constraint is the real guard --------------------------
    const brand = await prisma.brand.findFirst({ select: { id: true } });
    const category = await prisma.category.findFirst({ select: { id: true } });
    if (!brand || !category) {
      console.error("fail fixtures — need a Brand and a Category. Seed first.");
      process.exitCode = 1;
      return;
    }

    function orderFixture(number: string) {
      return {
        number,
        customerName: "Identity Fixture",
        customerEmail: `identity-${stamp}@techno-house.invalid`,
        customerPhone: "01710000000",
        subtotalAmount: 1000,
        totalAmount: 1000,
        shippingAddress: "12 Test Road, Dhaka",
      };
    }

    // A well-formed but non-numeric, non-legacy number must be refused by
    // Postgres even though nothing in the application would produce it. This is
    // the check that survives a future code change.
    let rejected = false;
    let rejectionMessage = "";
    try {
      const bad = await prisma.order.create({
        data: orderFixture(`ORD-BAD-${stamp}`),
        select: { id: true },
      });
      createdOrderIds.push(bad.id);
    } catch (error) {
      rejected = true;
      rejectionMessage = error instanceof Error ? error.message : String(error);
    }
    check(
      "the database refuses a non-numeric, non-legacy order number",
      rejected,
      "an arbitrary order-number format can still be written",
    );
    check(
      "and it is refused by the format constraint, not by something else",
      rejected && /Order_number_format/.test(rejectionMessage),
      `rejected for: ${rejectionMessage.slice(0, 160)}`,
    );

    // --- Legacy numbers must still be writable and readable ------------------
    // This is the property most easily destroyed by a "numeric only" change.
    // Legacy orders are quoted on invoices and recorded at the gateways; if the
    // constraint locked them out, restoring a backup or replaying history would
    // fail, and nothing in the application would explain why.
    const legacyNumber = `TH-20260101-ID${String(stamp).slice(-6)}`;
    const legacy = await prisma.order.create({
      data: orderFixture(legacyNumber),
      select: { id: true, number: true },
    });
    createdOrderIds.push(legacy.id);
    check(
      "a legacy TH- order can still be written",
      legacy.number === legacyNumber,
      "restoring or replaying historical orders would fail",
    );

    const legacyLookup = await prisma.order.findUnique({
      where: { number: legacyNumber },
      select: { id: true },
    });
    check(
      "a legacy TH- order is still findable by its number",
      legacyLookup?.id === legacy.id,
      "legacy tracking and support lookups would break",
    );

    // The admin loader resolves either identifier, which is what keeps existing
    // staff bookmarks on the cuid working after the URL change.
    const { getAdminOrderById } = await import("../../lib/admin/load-orders");
    const byNumber = await getAdminOrderById(legacyNumber);
    const byCuid = await getAdminOrderById(legacy.id);
    check(
      "admin resolves an order by its customer-facing number",
      byNumber?.number === legacyNumber,
    );
    check(
      "admin still resolves an order by its internal cuid (old bookmarks)",
      byCuid?.number === legacyNumber,
      "existing admin bookmarks would 404",
    );

    // --- The identifier used in admin URLs -----------------------------------
    const urlSources: [string, string][] = [
      ["admin order list", "features/admin/orders/admin-order-list.tsx"],
      ["admin dashboard", "features/admin/admin-dashboard.tsx"],
      ["admin customer detail", "features/admin/customers/admin-customer-detail.tsx"],
      ["admin order detail", "features/admin/orders/admin-order-detail.tsx"],
      ["admin order row actions", "features/admin/orders/admin-order-row-actions.tsx"],
      ["admin refund row actions", "features/admin/refunds/admin-refund-row-actions.tsx"],
    ];
    for (const [label, file] of urlSources) {
      const src = readFileSync(file, "utf-8");
      check(
        `${label} builds no /admin/orders link from a cuid`,
        !/\/admin\/orders\/\$\{order\.id\}/.test(src) &&
          !/\/admin\/orders\/\$\{refund\.orderId\}/.test(src) &&
          !/\/admin\/orders\/\$\{customer\.lastOrderId\}/.test(src),
        "staff would see a different reference from the customer",
      );
    }

    // Revalidation has to follow the URL or every edit leaves a stale page.
    //
    // This is the quietest failure in the whole identity change: the write
    // succeeds, no error is raised, and the only symptom is that a staff member
    // refreshes the order and does not see what they just saved. Every caller
    // that revalidates an order path is checked, not just the one that was
    // obviously in scope — `courier-actions.ts` was missed on the first pass
    // and kept revalidating the cuid path after the URLs moved.
    for (const [file, expression] of [
      ["features/admin/orders/order-actions.ts", "result.number"],
      ["features/admin/shipping/courier-actions.ts", "result.orderNumber"],
    ] as [string, string][]) {
      const src = readFileSync(file, "utf-8");
      const paths = src.match(/revalidatePath\(`\/admin\/orders\/[^`]+`\)/g) ?? [];
      check(
        `${file} revalidates at least one order path`,
        paths.length > 0,
        "an order mutation that revalidates nothing",
      );
      check(
        `${file} revalidates by order number, not by cuid`,
        paths.every((p) => p.includes(expression)),
        `found ${JSON.stringify(paths)} — a cached order page would survive the edit`,
      );
      // `orderId` in one of these paths is the cuid by naming convention here,
      // and is exactly what the bug looked like.
      check(
        `${file} has no cuid-keyed order path left`,
        !src.includes("/admin/orders/${input.orderId}") &&
          !src.includes("/admin/orders/${result.id}"),
      );
    }

    // --- Staff-facing references use the order number -----------------------
    // The alert title already says "New order 100187"; the link used to go to
    // the cuid, so the two disagreed. The href is PERSISTED on the StaffAlert
    // row, which is why this matters more than a normal link: every alert
    // written carries whatever shape was current when it was created.
    const alertsSrc = readFileSync("lib/orders/staff-order-alerts.ts", "utf-8");
    check(
      "the new-order alert links by order number",
      alertsSrc.includes("/admin/orders/${encodeURIComponent(input.orderNumber)}"),
      "the alert would link to the internal id",
    );
    check(
      "the new-order alert no longer links by cuid",
      !alertsSrc.includes("/admin/orders/${input.orderId}"),
    );

    // The admin refund queue must show which order each refund belongs to.
    // `refund.orderNumber` was loaded and searchable but never displayed, so
    // staff had to open each refund to find out.
    const refundListSrc = readFileSync(
      "features/admin/refunds/admin-refund-list.tsx",
      "utf-8",
    );
    check(
      "the refund list shows the order number",
      refundListSrc.includes("{refund.orderNumber}"),
      "staff cannot tell which order a refund belongs to",
    );
    check(
      "and links it to the order by number",
      refundListSrc.includes(
        "/admin/orders/${encodeURIComponent(refund.orderNumber)}",
      ),
    );
    // A table with more headers than cells silently shifts every column.
    check(
      "the refund table headers and cells still match",
      (refundListSrc.match(/<TableHeader/g) ?? []).length ===
        (refundListSrc.match(/<TableCell/g) ?? []).length,
      `headers=${(refundListSrc.match(/<TableHeader/g) ?? []).length} cells=${(refundListSrc.match(/<TableCell/g) ?? []).length}`,
    );

    // --- Audit metadata ------------------------------------------------------
    for (const [label, file] of [
      ["order update", "lib/orders/admin-orders.ts"],
      ["courier handoff", "lib/orders/send-to-courier.ts"],
      ["stale release", "lib/orders/stale-orders.ts"],
    ] as [string, string][]) {
      const src = readFileSync(file, "utf-8");
      check(
        `${label} audit metadata carries orderNumber`,
        /orderNumber:/.test(src),
        "the audit entry would only identify the order by its cuid",
      );
    }
    const auditViewSrc = readFileSync(
      "features/admin/staff/admin-audit-log-view.tsx",
      "utf-8",
    );
    check(
      "the audit log view prefers the order number over the cuid",
      /entityType === "Order"[\s\S]{0,200}orderNumber/.test(auditViewSrc),
    );
    // Historical rows have no orderNumber. They must still render, marked as
    // such — backfilling them would destroy the evidence value of an audit log.
    check(
      "historical entries fall back to the internal id rather than blanking",
      /legacy: row\.entityType === "Order"/.test(auditViewSrc) &&
        /internal id/.test(auditViewSrc),
      "pre-existing audit rows would lose their entity reference",
    );

    // --- No second generator -------------------------------------------------
    check(
      "createMockOrderId no longer exists",
      !/createMockOrderId/.test(readFileSync("lib/cart/checkout.ts", "utf-8")),
      "a second order-number generator is still in the tree",
    );
    check(
      "checkout has no client-side order-id fabrication",
      !/createMockOrderId/.test(
        readFileSync("features/checkout/checkout-view.tsx", "utf-8"),
      ),
    );
    check(
      "the generator refuses a non-numeric value before the database does",
      /isNumericOrderNumber\(number\)[\s\S]{0,200}throw new Error/.test(
        readFileSync("lib/orders/order-number.ts", "utf-8"),
      ),
      "a bad value would surface as a raw constraint violation",
    );

    // --- Gateways carry the same identifier ----------------------------------
    for (const [label, file, pattern] of [
      ["SSLCommerz tran_id", "lib/payments/sslcommerz.ts", /tran_id: input\.orderNumber/],
      ["bKash merchantInvoiceNumber", "lib/payments/bkash.ts", /merchantInvoiceNumber: input\.orderNumber/],
      ["Nagad orderId", "lib/payments/nagad.ts", /const orderId = input\.orderNumber/],
      ["courier invoice", "lib/orders/send-to-courier.ts", /invoice: order\.number/],
    ] as [string, string, RegExp][]) {
      check(
        `${label} uses the order number`,
        pattern.test(readFileSync(file, "utf-8")),
        "a gateway would record a different reference",
      );
    }
  } finally {
    if (createdOrderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`order identity failed (${failures}/${failures + passes})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${passes} order identity checks`);
}

main().catch((error) => {
  console.error("order identity suite crashed:", error);
  process.exitCode = 1;
});
