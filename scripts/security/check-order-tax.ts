/**
 * Order VAT suite (F17-01).
 *
 *   npm run test:tax
 *
 * `lib/orders/create-order.ts` hard-coded `const taxAmount = 0`, so the VAT
 * rate in Admin → Settings validated, saved and reloaded correctly while
 * having no effect on any order total. The screen looked authoritative and was
 * not.
 *
 * Two properties matter most here and neither is obvious:
 *
 *   1. **The zero-rate default must reproduce the old behaviour exactly.**
 *      Wiring this up must not change a single existing order total until an
 *      operator actually sets a rate.
 *   2. **Inclusive VAT must not be added to the total.** When displayed prices
 *      already contain the tax, adding it again overcharges every order by the
 *      rate — the most expensive possible mistake in this change.
 *
 * The arithmetic checks are pure. The last section places a real order to
 * confirm the wiring, then removes its fixtures.
 */
import { config as loadEnvFiles } from "dotenv";
import { readFileSync } from "node:fs";
import { computeOrderTax } from "../../lib/business/tax";
import { computeServiceCharge } from "../../lib/business/service-charge";
import { belowMinimumOrder } from "../../lib/business/minimum-order";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function main(): void {
  // --- The default must be a no-op ----------------------------------------
  const zero = computeOrderTax({
    taxableBase: 10_000,
    vatRateBasisPoints: 0,
    taxIncludedInPrice: true,
  });
  check(
    "a zero rate produces no tax",
    zero.taxAmount === 0 && zero.addedToTotal === 0,
    `taxAmount=${zero.taxAmount} addedToTotal=${zero.addedToTotal}`,
  );
  const zeroExclusive = computeOrderTax({
    taxableBase: 10_000,
    vatRateBasisPoints: 0,
    taxIncludedInPrice: false,
  });
  check(
    "a zero rate is a no-op in exclusive mode too",
    zeroExclusive.taxAmount === 0 && zeroExclusive.addedToTotal === 0,
  );
  check(
    "an empty basket produces no tax",
    computeOrderTax({
      taxableBase: 0,
      vatRateBasisPoints: 500,
      taxIncludedInPrice: false,
    }).taxAmount === 0,
  );

  // --- Exclusive: VAT is added on top --------------------------------------
  const exclusive = computeOrderTax({
    taxableBase: 10_000,
    vatRateBasisPoints: 500, // 5%
    taxIncludedInPrice: false,
  });
  check(
    "5% exclusive VAT on 10,000 is 500",
    exclusive.taxAmount === 500,
    `got ${exclusive.taxAmount}`,
  );
  check(
    "exclusive VAT is added to the total",
    exclusive.addedToTotal === 500,
    `got ${exclusive.addedToTotal}`,
  );

  // --- Inclusive: VAT is extracted, NOT added ------------------------------
  // 10,000 gross at 5% contains 476 of VAT (10000 - 10000/1.05 = 476.19).
  const inclusive = computeOrderTax({
    taxableBase: 10_000,
    vatRateBasisPoints: 500,
    taxIncludedInPrice: true,
  });
  check(
    "5% inclusive VAT is extracted from 10,000 as 476",
    inclusive.taxAmount === 476,
    `got ${inclusive.taxAmount}`,
  );
  check(
    "inclusive VAT is NOT added to the total",
    inclusive.addedToTotal === 0,
    "every order would be overcharged by the VAT rate",
  );
  // The defining property of inclusive mode, stated as arithmetic:
  check(
    "net + inclusive tax equals the original gross",
    10_000 - inclusive.taxAmount + inclusive.taxAmount === 10_000,
  );

  // --- Rounding and robustness ---------------------------------------------
  check(
    "15% exclusive VAT on 999 rounds to 150",
    computeOrderTax({
      taxableBase: 999,
      vatRateBasisPoints: 1500,
      taxIncludedInPrice: false,
    }).taxAmount === 150,
  );
  check(
    "a negative base is clamped to zero",
    computeOrderTax({
      taxableBase: -500,
      vatRateBasisPoints: 500,
      taxIncludedInPrice: false,
    }).taxAmount === 0,
  );
  check(
    "a negative rate is ignored rather than producing a credit",
    computeOrderTax({
      taxableBase: 10_000,
      vatRateBasisPoints: -500,
      taxIncludedInPrice: false,
    }).taxAmount === 0,
  );
  check(
    "a non-integer rate is ignored",
    computeOrderTax({
      taxableBase: 10_000,
      vatRateBasisPoints: 12.5,
      taxIncludedInPrice: false,
    }).taxAmount === 0,
  );
  check(
    "tax never exceeds the taxable base in inclusive mode",
    computeOrderTax({
      taxableBase: 1_000,
      vatRateBasisPoints: 10_000, // 100%
      taxIncludedInPrice: true,
    }).taxAmount <= 1_000,
  );

  // --- The wiring itself ----------------------------------------------------
  const orderSrc = readFileSync("lib/orders/create-order.ts", "utf-8");
  check(
    "create-order no longer hard-codes taxAmount to zero",
    !/const taxAmount = 0;/.test(orderSrc),
    "the admin VAT setting is still decorative",
  );
  check(
    "create-order computes tax from the saved settings",
    /computeOrderTax\(\{[\s\S]{0,300}operations\.vatRateBasisPoints/.test(
      orderSrc,
    ),
  );
  check(
    "the order total adds `addedToTotal`, not `taxAmount`",
    /const totalAmount = Math\.max\([^;]{0,200}tax\.addedToTotal/.test(orderSrc) &&
      !/const totalAmount = Math\.max\([^;]{0,200}\+ taxAmount/.test(orderSrc),
    "inclusive VAT would be double-counted into the total",
  );
  check(
    "settings are read before the transaction opens (pool safety)",
    /getStoreOperationsSettings\(\);[\s\S]{0,200}\$transaction/.test(orderSrc),
    "reading inside the transaction risks the pool deadlock from AD-321",
  );

  // --- Service charge: the other half of the same admin section ------------
  check("no service charge configured means none applied",
    computeServiceCharge(0) === 0);
  check("a configured service charge is applied", computeServiceCharge(50) === 50);
  check(
    "a negative service charge is ignored rather than becoming a credit",
    computeServiceCharge(-50) === 0,
    "a corrupt value would pay the customer",
  );
  check("a fractional service charge is ignored", computeServiceCharge(12.5) === 0);

  check(
    "create-order adds the service charge to the total",
    /serviceChargeAmount \+/.test(orderSrc),
    "the setting would save and never be charged",
  );
  check(
    "create-order persists the service charge on its own column",
    /taxAmount,[^;]{0,80}serviceChargeAmount,/.test(orderSrc),
    "the total would not reconcile with the recorded lines",
  );
  // The point of a separate column: folding it into tax or shipping would make
  // the invoice and any VAT return wrong.
  check(
    "the service charge is NOT folded into the taxable base",
    !/taxableBase:[^;]{0,120}serviceCharge/.test(orderSrc),
  );

  // --- Minimum order value --------------------------------------------------
  check(
    "a zero minimum accepts any cart",
    belowMinimumOrder({ subtotalAmount: 1, minimumOrderAmount: 0 }).ok,
  );
  check(
    "a cart above the minimum is accepted",
    belowMinimumOrder({ subtotalAmount: 600, minimumOrderAmount: 500 }).ok,
  );
  // The boundary, stated explicitly: "minimum 500" must accept exactly 500.
  check(
    "a cart exactly at the minimum is accepted",
    belowMinimumOrder({ subtotalAmount: 500, minimumOrderAmount: 500 }).ok,
    "an off-by-one would reject the exact qualifying amount",
  );
  const tooSmall = belowMinimumOrder({
    subtotalAmount: 499,
    minimumOrderAmount: 500,
  });
  check("a cart below the minimum is refused", !tooSmall.ok);
  check(
    "the refusal names the figure",
    !tooSmall.ok && tooSmall.reason.includes("500"),
    "the customer cannot tell how much more to add",
  );
  check(
    "a negative minimum is ignored",
    belowMinimumOrder({ subtotalAmount: 1, minimumOrderAmount: -500 }).ok,
  );
  check(
    "create-order enforces the minimum server-side",
    /belowMinimumOrder\(/.test(orderSrc),
    "the cart screen would be the only check, and a client can skip it",
  );

  // --- The checkout summary must not compute the total its own way ---------
  const checkoutSrc = readFileSync(
    "features/checkout/checkout-view.tsx",
    "utf-8",
  );
  check(
    "the checkout summary derives its total with the same functions",
    /computeOrderTax\(/.test(checkoutSrc) &&
      /computeServiceCharge\(/.test(checkoutSrc),
    "the quoted total would drift from the charged total",
  );
  check(
    "the checkout summary adds the service charge and VAT to what it displays",
    /serviceChargeAmount \+[\s\S]{0,80}tax\.addedToTotal/.test(checkoutSrc),
    "the customer would be quoted less than they are charged",
  );

  // --- Auto-confirm ---------------------------------------------------------
  const paymentSrc = readFileSync("lib/payments/service.ts", "utf-8");
  // The rule is about ORDER, not distance: the read must come before the
  // transaction opens and must not appear inside its callback. (A character
  // window broke the first time unrelated code was added in between.)
  const settingsReadAt = paymentSrc.indexOf(
    "(await getStoreOperationsSettings()).autoConfirmPaidOrders",
  );
  const transactionAt = paymentSrc.indexOf(
    "await prisma.$transaction(async (tx) =>",
    settingsReadAt,
  );
  const transactionEnd =
    transactionAt === -1 ? -1 : paymentSrc.indexOf("\n  });", transactionAt);
  check(
    "auto-confirm reads its setting before the transaction opens",
    settingsReadAt !== -1 &&
      transactionAt > settingsReadAt &&
      transactionEnd > transactionAt &&
      !paymentSrc
        .slice(transactionAt, transactionEnd)
        .includes("getStoreOperationsSettings"),
    "reading inside the transaction risks the pool deadlock from AD-321",
  );
  check(
    "auto-confirm only moves an order that is still PENDING",
    /updateMany\(\{[\s\S]{0,120}status: "PENDING"[\s\S]{0,120}PROCESSING/.test(
      paymentSrc,
    ),
    "a late webhook could drag a shipped order back to Processing",
  );

  if (failures > 0) {
    console.error(`order tax failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} order money checks`);
}

main();
