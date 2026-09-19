/**
 * Payment service (P13-T04).
 *
 * Validates a pending payment row, starts a hosted session after the order
 * exists, and applies later status changes. Callers must supply expected
 * amount and currency when moving to PAID — the client is never trusted.
 * Browser return URLs must not call this with PAID. Verified IPN / execute
 * (P13-T05) is the only path that may request PAID.
 */
import { getPrisma } from "@/lib/db/prisma";
import { getOrderViewById } from "@/lib/orders/customer-orders";
import { sendCustomerOrderConfirmationSafe } from "@/lib/orders/order-confirmation-email";
import { sendCustomerOrderConfirmationSmsSafe } from "@/lib/orders/order-confirmation-sms";
import { releaseOrderStock } from "@/lib/orders/stock-reservation";
import {
  getPaymentAdapter,
  paymentStartKey,
  type PaymentProviderId,
  type PaymentStartPlan,
} from "@/lib/payments/adapters";
import { hostedGatewayReady } from "@/lib/payments/config";
import { getOfflinePaymentConfig } from "@/lib/payments/offline-config";
import { isAllowedPaymentRedirect } from "@/lib/payments/redirect";
import { paymentTransitionError } from "@/lib/payments/status";
import { getStoreOperationsSettings } from "@/lib/business/operations-config";
import type { PaymentStatus } from "@/lib/generated/prisma/enums";

export type ApplyPaymentInput = {
  paymentId: string;
  next: PaymentStatus;
  transactionRef?: string | null;
  expectedAmount?: number;
  expectedCurrency?: "BDT";
  failureReason?: string | null;
};

export type ApplyPaymentResult =
  | { ok: true; status: PaymentStatus; paymentId: string }
  | { ok: false; reason: string };

export type StartHostedCheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: true; redirectUrl: null; skipped: true }
  | { ok: false; reason: string };

const FAILURE_REASON_MAX = 200;

export async function preparePaymentStart(
  plan: PaymentStartPlan,
  input: {
    orderNumber: string;
    amount: number;
    currency: "BDT";
  },
): Promise<{ ok: true } | { ok: false; reason: string }> {
  getPaymentAdapter(plan.provider);
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    return { ok: false, reason: "Payment amount is not valid." };
  }
  if (input.currency !== "BDT") {
    return { ok: false, reason: "Unsupported payment currency." };
  }
  if (
    plan.provider === "sslcommerz" ||
    plan.provider === "bkash" ||
    plan.provider === "nagad"
  ) {
    return await hostedGatewayReady(plan.provider);
  }
  if (plan.provider === "cod") {
    const offline = await getOfflinePaymentConfig();
    if (!offline.codEnabled) {
      return {
        ok: false,
        reason: "Cash on delivery is temporarily unavailable.",
      };
    }
  }
  return { ok: true };
}

export async function startHostedCheckoutForOrder(
  orderId: string,
): Promise<StartHostedCheckoutResult> {
  const prisma = getPrisma();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      totalAmount: true,
      currency: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      shippingAddress: true,
      payments: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          provider: true,
          amount: true,
          currency: true,
          status: true,
        },
      },
    },
  });
  const payment = order?.payments[0];
  if (!order || !payment) {
    return { ok: false, reason: "Payment row was not found for this order." };
  }
  if (payment.provider === "cod") {
    return { ok: true, redirectUrl: null, skipped: true };
  }
  if (payment.status === "PROCESSING" || payment.status === "PAID") {
    return { ok: true, redirectUrl: null, skipped: true };
  }
  if (
    payment.provider !== "sslcommerz" &&
    payment.provider !== "bkash" &&
    payment.provider !== "nagad"
  ) {
    return { ok: false, reason: "Unsupported payment provider." };
  }

  const ready = await hostedGatewayReady(payment.provider);
  if (!ready.ok) {
    return ready;
  }

  try {
    const started = await getPaymentAdapter(
      payment.provider as PaymentProviderId,
    ).startCharge({
      orderNumber: order.number,
      amount: payment.amount,
      currency: "BDT",
      idempotencyKey: paymentStartKey(order.number),
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerAddress: order.shippingAddress,
    });
    if (!started.ok) {
      return { ok: false, reason: started.reason };
    }
    if (started.flow !== "hosted") {
      return {
        ok: false,
        reason:
          payment.provider === "bkash"
            ? "bKash did not open a checkout page."
            : payment.provider === "nagad"
              ? "Nagad did not open a checkout page."
              : "SSLCommerz did not open a checkout page.",
      };
    }
    if (!isAllowedPaymentRedirect(started.redirectUrl)) {
      return {
        ok: false,
        reason: "Payment gateway returned a blocked redirect URL.",
      };
    }

    await applyPaymentTransition({
      paymentId: payment.id,
      next: "PROCESSING",
      transactionRef: started.sessionRef,
    });
    return { ok: true, redirectUrl: started.redirectUrl };
  } catch {
    return {
      ok: false,
      reason:
        payment.provider === "bkash"
          ? "Could not start bKash checkout."
          : payment.provider === "nagad"
            ? "Could not start Nagad checkout."
            : "Could not start SSLCommerz checkout.",
    };
  }
}

export function paymentCreateData(
  plan: PaymentStartPlan,
  input: { orderNumber: string; amount: number; currency: "BDT" },
) {
  return {
    provider: plan.provider,
    method: plan.method,
    status: "PENDING" as const,
    amount: input.amount,
    currency: input.currency,
    idempotencyKey: paymentStartKey(input.orderNumber),
  };
}

export async function applyPaymentTransition(
  input: ApplyPaymentInput,
): Promise<ApplyPaymentResult> {
  const prisma = getPrisma();
  const payment = await prisma.payment.findUnique({
    where: { id: input.paymentId },
    include: {
      order: {
        select: { id: true, totalAmount: true, currency: true },
      },
    },
  });
  if (!payment) {
    return { ok: false, reason: "Payment was not found." };
  }

  if (payment.status === input.next) {
    const replayRef = input.transactionRef?.trim() ?? "";
    if (
      input.next === "PAID" &&
      replayRef &&
      payment.transactionRef &&
      payment.transactionRef !== replayRef
    ) {
      return { ok: false, reason: "That transaction was already recorded." };
    }
    return { ok: true, status: payment.status, paymentId: payment.id };
  }

  const illegal = paymentTransitionError(payment.status, input.next);
  if (illegal) {
    return { ok: false, reason: illegal };
  }

  const nextRef = input.transactionRef?.trim() ?? "";

  if (input.next === "PAID") {
    if (!nextRef) {
      return { ok: false, reason: "A transaction reference is required." };
    }
    if (
      input.expectedAmount !== payment.amount ||
      input.expectedAmount !== payment.order.totalAmount
    ) {
      return { ok: false, reason: "Payment amount does not match the order." };
    }
    if (
      input.expectedCurrency !== payment.currency ||
      payment.currency !== payment.order.currency
    ) {
      return {
        ok: false,
        reason: "Payment currency does not match the order.",
      };
    }
  }

  if (nextRef && (input.next === "PAID" || input.next === "PROCESSING")) {
    const duplicate = await prisma.payment.findFirst({
      where: {
        provider: payment.provider,
        transactionRef: nextRef,
        NOT: { id: payment.id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return { ok: false, reason: "That transaction was already recorded." };
    }
  }

  if (input.next === "REFUNDED" || input.next === "PARTIALLY_REFUNDED") {
    return { ok: false, reason: "Refunds use the refund workflow." };
  }

  // Read BEFORE the transaction opens. Reading settings from inside it would
  // take a second connection from a `max: 5` pool while holding the first —
  // the shape that deadlocked the wallet path (AD-321). Only fetched on the
  // one transition that can use it.
  const autoConfirm =
    input.next === "PAID"
      ? (await getStoreOperationsSettings()).autoConfirmPaidOrders
      : false;

  const now = new Date();
  const failureReason =
    input.next === "FAILED"
      ? (input.failureReason?.trim().slice(0, FAILURE_REASON_MAX) ?? null)
      : null;
  // Set inside the transaction only if the auto-confirm write below actually
  // matched a still-pending order — read after commit to fire the customer
  // notification exactly once, the same "confirmedAt just got set" moment
  // lib/orders/admin-orders.ts fires it on for the staff-driven path.
  let autoConfirmedOrderId: string | null = null;

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${payment.id} FOR UPDATE`;
    const locked = await tx.payment.findUnique({
      where: { id: payment.id },
      select: { status: true },
    });
    if (!locked) {
      throw new Error("Payment was not found.");
    }
    if (locked.status === input.next) {
      return;
    }
    const again = paymentTransitionError(locked.status, input.next);
    if (again) {
      throw new Error(again);
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: input.next,
        transactionRef:
          input.next === "PAID" || (input.next === "PROCESSING" && nextRef)
            ? nextRef || null
            : undefined,
        sessionRef:
          input.next === "PROCESSING" && nextRef ? nextRef : undefined,
        failureReason,
        paidAt: input.next === "PAID" ? now : undefined,
        authorizedAt:
          input.next === "PROCESSING" || input.next === "PAID"
            ? now
            : undefined,
      },
    });
    await tx.order.update({
      where: { id: payment.order.id },
      data: { paymentStatus: input.next },
    });

    // `autoConfirmPaidOrders` in Admin -> Settings was another value in the
    // persist-only group (F17-01): it saved and reloaded and nothing read it.
    // Off by default, so the default behaviour is unchanged.
    //
    // A separate conditional write rather than extra fields on the update
    // above, because the condition is on the ORDER's state, not the payment's:
    // `status: "PENDING"` in the `where` is what stops a late webhook dragging
    // an order staff have already shipped or cancelled back to "Processing".
    // Auto-confirmation is only ever a step forward from the first state.
    if (autoConfirm && input.next === "PAID") {
      const confirmed = await tx.order.updateMany({
        where: { id: payment.order.id, status: "PENDING" },
        data: { status: "PROCESSING", confirmedAt: now },
      });
      if (confirmed.count > 0) {
        autoConfirmedOrderId = payment.order.id;
      }
    }

    // A payment that failed or was cancelled means the goods were never sold,
    // so the units this order is holding go back on the shelf (DSA-02).
    // `releaseOrderStock` claims `Order.stockState` atomically, so if the order
    // was also cancelled through the admin path this is a no-op rather than a
    // second decrement.
    if (input.next === "FAILED" || input.next === "CANCELLED") {
      await releaseOrderStock(tx, payment.order.id);
    }
  });

  if (autoConfirmedOrderId) {
    try {
      const view = await getOrderViewById(autoConfirmedOrderId);
      if (view) {
        sendCustomerOrderConfirmationSafe(view, "confirmed");
        sendCustomerOrderConfirmationSmsSafe(view, "confirmed");
      }
    } catch {
      // The payment/order state already saved; never fail it on notification delivery.
    }
  }

  return { ok: true, status: input.next, paymentId: payment.id };
}
