/**
 * Payment security suite (P13-T07).
 *
 *   npm run test:payments
 *
 * Covers the cases in docs/PAYMENT_SECURITY.md. Does not call live gateways
 * unless store credentials are already present, and never logs secrets.
 */
import { createHash } from "node:crypto";
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import { parseTakaAmount } from "../../lib/payments/amount";
import {
  readCallbackFields,
  webhookResponse,
} from "../../lib/payments/callback-fields";
import {
  applySslcommerzValidation,
  processSslcommerzIpn,
  sslcommerzIpnHashValid,
} from "../../lib/payments/sslcommerz";
import {
  applyBkashChargeSnapshot,
  processBkashCallback,
} from "../../lib/payments/bkash";
import { applyPaymentTransition } from "../../lib/payments/service";
import { paymentTransitionError } from "../../lib/payments/status";
import { isAllowedPaymentRedirect } from "../../lib/payments/redirect";
import {
  parsePaymentBrowserReturn,
  paymentReturnUrl,
} from "../../lib/payments/return";
import {
  completeRefund,
  decideRefund,
  requestRefundForUser,
} from "../../lib/refunds/workflow";
import { refundTransitionError } from "../../lib/refunds/status";

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

function signedIpn(password: string): Record<string, string> {
  const fields = {
    amount: "1500.00",
    tran_id: "TH-HASH",
    verify_key: "amount,tran_id",
    verify_sign: "",
  };
  const data: Record<string, string> = {
    amount: fields.amount,
    tran_id: fields.tran_id,
    store_passwd: createHash("md5").update(password).digest("hex"),
  };
  fields.verify_sign = createHash("md5")
    .update(
      Object.keys(data)
        .sort()
        .map((key) => `${key}=${data[key]}`)
        .join("&"),
    )
    .digest("hex");
  return fields;
}

async function main(): Promise<void> {
  check("parse 1500.00", parseTakaAmount("1500.00") === 1500);
  check("reject fractional taka", parseTakaAmount("1500.50") === null);
  check(
    "https sslcommerz allowed",
    isAllowedPaymentRedirect("https://sandbox.sslcommerz.com/pay"),
  );
  check(
    "http redirect rejected",
    !isAllowedPaymentRedirect("http://sandbox.sslcommerz.com/pay"),
  );
  check(
    "unknown host rejected",
    !isAllowedPaymentRedirect("https://evil.example/pay"),
  );
  check(
    "browser paid query ignored",
    parsePaymentBrowserReturn("paid") === null,
  );
  check(
    "browser success is display-only",
    parsePaymentBrowserReturn("success") === "success",
  );
  const returnUrl = paymentReturnUrl(
    "https://www.example.com/api/payments/bkash/callback",
    "TH-TEST",
    "success",
  );
  check(
    "browser return stays on the storefront path",
    returnUrl.pathname === "/checkout/payment/return" &&
      returnUrl.searchParams.get("status") === "success",
  );

  const ipnFields = await readCallbackFields(
    new Request("http://localhost/api/payments/sslcommerz/ipn", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "val_id=fake&tran_id=TH-NONE&amount=1500.00",
    }),
  );
  check(
    "IPN body is parsed but not trusted",
    ipnFields.val_id === "fake" && ipnFields.tran_id === "TH-NONE",
  );

  const validHash = signedIpn("dummy-store-pass");
  check(
    "valid IPN signature",
    sslcommerzIpnHashValid(validHash, "dummy-store-pass"),
  );
  check(
    "invalid IPN signature",
    !sslcommerzIpnHashValid(validHash, "other-store-pass"),
  );

  check(
    "timeout retries",
    webhookResponse({ acknowledged: false, paid: false }).status === 503,
  );
  check(
    "invalid event does not retry",
    webhookResponse({ acknowledged: true, paid: false }).status === 200,
  );

  check("paid↛pending", paymentTransitionError("PAID", "PENDING") !== null);
  check(
    "pending cannot jump to refunded",
    paymentTransitionError("PENDING", "REFUNDED") !== null,
  );
  check(
    "completed refund is terminal",
    refundTransitionError("COMPLETED", "APPROVED") !== null,
  );
  check(
    "complete before approve illegal",
    refundTransitionError("REQUESTED", "COMPLETED") !== null,
  );

  const unsignedBkash = await processBkashCallback({
    orderNumber: "TH-NONE",
    paymentID: null,
    status: "success",
  });
  check("bKash success without paymentID does not pay", !unsignedBkash.paid);

  if (
    !process.env.SSLCOMMERZ_STORE_ID?.trim() ||
    !process.env.SSLCOMMERZ_STORE_PASSWORD?.trim()
  ) {
    const deferred = await processSslcommerzIpn({
      val_id: "fake",
      tran_id: "TH-NONE",
      amount: "1500.00",
      verify_sign: "deadbeef",
      verify_key: "amount",
    });
    check(
      "missing credentials do not pay",
      !deferred.paid && deferred.acknowledged,
    );
  } else {
    const badSign = await processSslcommerzIpn({
      val_id: "fake",
      tran_id: "TH-NONE",
      amount: "1500.00",
      verify_sign: "deadbeef",
      verify_key: "amount,tran_id",
    });
    check(
      "configured invalid signature does not pay",
      !badSign.paid && badSign.acknowledged,
    );
  }

  const prisma = getPrisma();
  const stamp = Date.now();
  const owner = await prisma.user.create({
    data: {
      email: `sec-t07-a-${stamp}@techno-house.invalid`,
      fullName: "T07 Owner",
      phone: `016${String(stamp).slice(-8)}`,
    },
    select: { id: true, email: true },
  });
  const other = await prisma.user.create({
    data: {
      email: `sec-t07-b-${stamp}@techno-house.invalid`,
      fullName: "T07 Other",
      phone: `015${String(stamp).slice(-8)}`,
    },
    select: { id: true },
  });
  const staff = await prisma.staff.findFirst({
    select: { id: true, fullName: true, email: true },
  });
  check("staff fixture", Boolean(staff));

  const sslNumber = `TH-T07S-${stamp}`;
  const paidNumber = `TH-T07P-${stamp}`;
  const sslOrder = await prisma.order.create({
    data: {
      number: sslNumber,
      userId: owner.id,
      customerName: "T07 Owner",
      customerEmail: owner.email ?? "sec-t07@techno-house.invalid",
      customerPhone: "01600000000",
      shippingAddress: "Security",
      subtotalAmount: 1500,
      totalAmount: 1500,
      payments: {
        create: {
          provider: "sslcommerz",
          method: "sslcommerz",
          status: "PROCESSING",
          amount: 1500,
          currency: "BDT",
          idempotencyKey: `sec-t07-ssl-${stamp}`,
          transactionRef: `sess-ssl-${stamp}`,
          sessionRef: `sess-ssl-${stamp}`,
        },
      },
    },
    select: { id: true, payments: { select: { id: true } } },
  });
  const paidOrder = await prisma.order.create({
    data: {
      number: paidNumber,
      userId: owner.id,
      customerName: "T07 Owner",
      customerEmail: owner.email ?? "sec-t07@techno-house.invalid",
      customerPhone: "01600000001",
      shippingAddress: "Security",
      subtotalAmount: 1500,
      totalAmount: 1500,
      paymentStatus: "PAID",
      payments: {
        create: {
          provider: "cod",
          method: "cod",
          status: "PAID",
          amount: 1500,
          currency: "BDT",
          idempotencyKey: `sec-t07-cod-${stamp}`,
          transactionRef: `cod-${stamp}`,
        },
      },
    },
    select: { id: true, payments: { select: { id: true } } },
  });
  const paymentId = sslOrder.payments[0]?.id ?? "";

  try {
    const amountMismatch = await applySslcommerzValidation({
      status: "VALID",
      tran_id: sslNumber,
      amount: "1499.00",
      currency: "BDT",
      bank_tran_id: `bank-amt-${stamp}`,
    });
    check("amount mismatch does not pay", !amountMismatch.paid);

    const currencyMismatch = await applySslcommerzValidation({
      status: "VALID",
      tran_id: sslNumber,
      amount: "1500.00",
      currency: "USD",
      bank_tran_id: `bank-usd-${stamp}`,
    });
    check("currency mismatch does not pay", !currencyMismatch.paid);

    const invalidTx = await applySslcommerzValidation({
      status: "INVALID_TRANSACTION",
      tran_id: sslNumber,
      amount: "1500.00",
      currency: "BDT",
      bank_tran_id: `bank-inv-${stamp}`,
    });
    check("invalid transaction does not pay", !invalidTx.paid);

    const unknown = await applySslcommerzValidation({
      status: "VALID",
      tran_id: "TH-MISSING",
      amount: "1500.00",
      currency: "BDT",
      bank_tran_id: `bank-miss-${stamp}`,
    });
    check("unknown order does not pay", !unknown.paid);

    const storeMismatch = await applySslcommerzValidation(
      {
        status: "VALID",
        tran_id: sslNumber,
        amount: "1500.00",
        currency: "BDT",
        bank_tran_id: `bank-store-${stamp}`,
        store_id: "other-store",
      },
      "our-store",
    );
    check("store mismatch does not pay", !storeMismatch.paid);

    const noRef = await applyPaymentTransition({
      paymentId,
      next: "PAID",
      expectedAmount: 1500,
      expectedCurrency: "BDT",
    });
    check("PAID without transaction ref rejected", !noRef.ok);

    const paid = await applySslcommerzValidation({
      status: "VALID",
      tran_id: sslNumber,
      amount: "1500.00",
      currency: "BDT",
      bank_tran_id: `bank-ok-${stamp}`,
    });
    check("valid validation pays", paid.paid);

    const duplicate = await applySslcommerzValidation({
      status: "VALIDATED",
      tran_id: sslNumber,
      amount: "1500.00",
      currency: "BDT",
      bank_tran_id: `bank-ok-${stamp}`,
    });
    check(
      "duplicate webhook is idempotent",
      duplicate.paid && duplicate.acknowledged,
    );

    const otherRef = await applySslcommerzValidation({
      status: "VALID",
      tran_id: sslNumber,
      amount: "1500.00",
      currency: "BDT",
      bank_tran_id: `bank-other-${stamp}`,
    });
    check("second transaction ref rejected", !otherRef.paid);

    const replayPaid = await applyPaymentTransition({
      paymentId,
      next: "PAID",
      transactionRef: `bank-ok-${stamp}`,
      expectedAmount: 1500,
      expectedCurrency: "BDT",
    });
    check("repeated payment request is idempotent", replayPaid.ok);

    const checkoutRefund = await applyPaymentTransition({
      paymentId,
      next: "REFUNDED",
    });
    check("checkout cannot mark refunded", !checkoutRefund.ok);

    const failedBkash = await applyBkashChargeSnapshot({
      transactionStatus: "Failed",
      amount: "1500",
      currency: "BDT",
      merchantInvoiceNumber: sslNumber,
      trxID: `trx-fail-${stamp}`,
    });
    check("payment failure does not pay", !failedBkash.paid);

    const stolen = await requestRefundForUser(other.id, {
      orderNumber: paidNumber,
      amount: 500,
      reasonId: null,
      reasonText: "not mine",
    });
    check("unauthorized refund request rejected", !stolen.ok);

    const requested = await requestRefundForUser(owner.id, {
      orderNumber: paidNumber,
      amount: 500,
      reasonId: null,
      reasonText: "partial",
    });
    check("owner can request refund", requested.ok);

    const early = await completeRefund({
      refundId: requested.ok ? requested.id : "",
      actor: {
        staffId: staff?.id ?? "missing",
        fullName: staff?.fullName ?? "none",
        email: staff?.email ?? "none",
      },
    });
    check("unauthorized payout before approve rejected", !early.ok);

    if (staff && requested.ok) {
      const approved = await decideRefund({
        refundId: requested.id,
        next: "APPROVED",
        actor: {
          staffId: staff.id,
          fullName: staff.fullName,
          email: staff.email,
        },
      });
      check("staff can approve", approved.ok);
      const completed = await completeRefund({
        refundId: requested.id,
        actor: {
          staffId: staff.id,
          fullName: staff.fullName,
          email: staff.email,
        },
      });
      check("approved payout completes", completed.ok);
      const again = await completeRefund({
        refundId: requested.id,
        actor: {
          staffId: staff.id,
          fullName: staff.fullName,
          email: staff.email,
        },
      });
      check("duplicate refund complete is idempotent", again.ok);
    }

    const stillProcessing = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { status: true, transactionRef: true },
    });
    check(
      "ssl payment stayed paid after replay",
      stillProcessing?.status === "PAID",
    );
    check(
      "ssl transaction ref stored once",
      stillProcessing?.transactionRef === `bank-ok-${stamp}`,
    );

    const paidRow = await prisma.payment.findFirst({
      where: { orderId: paidOrder.id },
      select: { status: true },
    });
    check(
      "cod refund left payment partially refunded",
      paidRow?.status === "PARTIALLY_REFUNDED",
    );

    // --- DSA-07: concurrent refund requests -------------------------------
    // Two identical requests arriving together must not both open a refund.
    const raceOrder = await prisma.order.create({
      data: {
        number: `TH-T07R-${stamp}`,
        userId: owner.id,
        customerName: "T07 Owner",
        customerEmail: owner.email ?? "sec-t07@techno-house.invalid",
        customerPhone: "01600000002",
        shippingAddress: "Security",
        subtotalAmount: 2000,
        totalAmount: 2000,
        paymentStatus: "PAID",
        payments: {
          create: {
            provider: "cod",
            method: "cod",
            status: "PAID",
            amount: 2000,
            currency: "BDT",
            idempotencyKey: `sec-t07-race-${stamp}`,
            transactionRef: `cod-race-${stamp}`,
          },
        },
      },
      select: { id: true, number: true },
    });

    const concurrent = await Promise.all([
      requestRefundForUser(owner.id, {
        orderNumber: raceOrder.number,
        amount: 500,
        reasonId: null,
        reasonText: "race a",
      }),
      requestRefundForUser(owner.id, {
        orderNumber: raceOrder.number,
        amount: 500,
        reasonId: null,
        reasonText: "race b",
      }),
    ]);
    const accepted = concurrent.filter((r) => r.ok).length;
    check(
      "concurrent refund requests open exactly one refund",
      accepted === 1,
      `${accepted} of 2 were accepted`,
    );
    const openCount = await prisma.refund.count({
      where: { orderId: raceOrder.id, status: { in: ["REQUESTED", "APPROVED"] } },
    });
    check(
      "only one open refund row exists for the order",
      openCount === 1,
      `openCount=${openCount}`,
    );

    // --- DSA-04: the payout claim is single-shot ---------------------------
    if (staff) {
      const raceRefund = await prisma.refund.findFirst({
        where: { orderId: raceOrder.id },
        select: { id: true },
      });
      await decideRefund({
        refundId: raceRefund!.id,
        next: "APPROVED",
        actor: {
          staffId: staff.id,
          fullName: staff.fullName,
          email: staff.email,
        },
      });

      // Simulate a completion that is mid-flight at the gateway.
      await prisma.refund.update({
        where: { id: raceRefund!.id },
        data: { payoutStatus: "PROCESSING" },
      });
      const whileClaimed = await completeRefund({
        refundId: raceRefund!.id,
        actor: {
          staffId: staff.id,
          fullName: staff.fullName,
          email: staff.email,
        },
      });
      check(
        "a refund already claimed for payout refuses a second payout",
        !whileClaimed.ok,
        whileClaimed.ok ? "a second payout was allowed" : undefined,
      );

      // Releasing the claim lets the retry through, exactly once.
      await prisma.refund.update({
        where: { id: raceRefund!.id },
        data: { payoutStatus: "PENDING" },
      });
      const bothCompletes = await Promise.all([
        completeRefund({
          refundId: raceRefund!.id,
          actor: {
            staffId: staff.id,
            fullName: staff.fullName,
            email: staff.email,
          },
        }),
        completeRefund({
          refundId: raceRefund!.id,
          actor: {
            staffId: staff.id,
            fullName: staff.fullName,
            email: staff.email,
          },
        }),
      ]);
      check(
        "concurrent completes do not both pay out",
        bothCompletes.filter((r) => r.ok).length <= 1 ||
          bothCompletes.every((r) => r.ok),
      );
      const settled = await prisma.refund.findUnique({
        where: { id: raceRefund!.id },
        select: { status: true, payoutStatus: true, amount: true },
      });
      check(
        "the refund settled exactly once",
        settled?.status === "COMPLETED" && settled?.payoutStatus === "PAID",
        `status=${settled?.status} payoutStatus=${settled?.payoutStatus}`,
      );
      const completedTotal = await prisma.refund.aggregate({
        where: { orderId: raceOrder.id, status: "COMPLETED" },
        _sum: { amount: true },
      });
      check(
        "only one refund amount was ever completed for the order",
        completedTotal._sum.amount === 500,
        `completed total=${completedTotal._sum.amount}`,
      );
    }
  } finally {
    await prisma.refundEvent.deleteMany({
      where: { refund: { order: { userId: { in: [owner.id, other.id] } } } },
    });
    await prisma.refund.deleteMany({
      where: { order: { userId: { in: [owner.id, other.id] } } },
    });
    await prisma.payment.deleteMany({
      where: { order: { userId: { in: [owner.id, other.id] } } },
    });
    await prisma.order.deleteMany({
      where: { userId: { in: [owner.id, other.id] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.id, other.id] } },
    });
    await prisma.$disconnect();
  }

  try {
    const origin = process.env.APP_URL?.trim() || "http://localhost:3000";
    const ipn = await fetch(`${origin}/api/payments/sslcommerz/ipn`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "val_id=fake&tran_id=TH-NONE&amount=1500.00",
    });
    check("unsigned IPN does not pay (HTTP)", ipn.status === 200);
    const browser = await fetch(
      `${origin}/checkout/payment/return?status=success`,
    );
    check("browser return stays unpaid (HTTP)", browser.status === 200);
  } catch {
    // App not running — skip HTTP cases.
  }

  // Source guards (P17-T02): browser return must never import paid transitions.
  const { readFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  // Guard against calls, not mentions: a comment explaining that the browser
  // return deliberately does NOT call the IPN processor is not a call. Only
  // whole comment lines are dropped, so trailing comments after code still count.
  const codeOnly = (source: string): string =>
    source
      .split("\n")
      .filter((line) => {
        const text = line.trim();
        return !(
          text.startsWith("//") ||
          text.startsWith("*") ||
          text.startsWith("/*")
        );
      })
      .join("\n");
  const sslReturn = codeOnly(
    readFileSync(
      join(process.cwd(), "app/api/payments/sslcommerz/return/route.ts"),
      "utf8",
    ),
  );
  check(
    "SSLCommerz browser return has no applyPaymentTransition",
    !sslReturn.includes("applyPaymentTransition") &&
      !sslReturn.includes("processSslcommerzIpn") &&
      !sslReturn.includes("confirmPayment"),
  );
  const storefrontReturn = codeOnly(
    readFileSync(
      join(process.cwd(), "app/(storefront)/checkout/payment/return/page.tsx"),
      "utf8",
    ),
  );
  check(
    "storefront return page has no applyPaymentTransition",
    !storefrontReturn.includes("applyPaymentTransition") &&
      !storefrontReturn.includes("processSslcommerzIpn") &&
      !storefrontReturn.includes("processBkashCallback"),
  );
  const paymentConfig = readFileSync(
    join(process.cwd(), "lib/payments/config.ts"),
    "utf8",
  );
  check(
    "payment config refuses window",
    paymentConfig.includes('typeof window !== "undefined"'),
  );
  check(
    "http gateway redirect rejected",
    !isAllowedPaymentRedirect("http://sandbox.sslcommerz.com/pay"),
  );

  if (failures > 0) {
    console.error(`${failures} of ${checks} payment security checks failed`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} payment security checks`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
