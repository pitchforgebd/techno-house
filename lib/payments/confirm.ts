/**
 * Apply a gateway-verified payment result (P13-T05).
 * Callers must already have confirmed the event with the provider.
 * Browser return URLs must not call this.
 */
import { getPrisma } from "@/lib/db/prisma";
import { applyPaymentTransition } from "@/lib/payments/service";
import type { PaymentStatus } from "@/lib/generated/prisma/enums";

export type ConfirmGatewayResult =
  | { ok: true; status: PaymentStatus; paid: boolean }
  | { ok: false; reason: string };

export async function confirmGatewayPayment(input: {
  provider: "sslcommerz" | "bkash" | "nagad";
  orderNumber: string;
  transactionRef: string;
  amount: number;
  currency: "BDT";
}): Promise<ConfirmGatewayResult> {
  const ref = input.transactionRef.trim();
  if (!ref) {
    return { ok: false, reason: "A transaction reference is required." };
  }

  const payment = await findOrderPayment(input.orderNumber);
  if (!payment) {
    return { ok: false, reason: "Order was not found." };
  }
  if (payment.provider !== input.provider) {
    return { ok: false, reason: "Payment provider does not match the order." };
  }

  const applied = await applyPaymentTransition({
    paymentId: payment.id,
    next: "PAID",
    transactionRef: ref,
    expectedAmount: input.amount,
    expectedCurrency: input.currency,
  });
  if (!applied.ok) {
    return applied;
  }
  return { ok: true, status: applied.status, paid: applied.status === "PAID" };
}

export async function rejectGatewayPayment(input: {
  provider: "sslcommerz" | "bkash" | "nagad";
  orderNumber: string;
  sessionRef: string;
  next: "FAILED" | "CANCELLED";
  failureReason?: string;
}): Promise<ConfirmGatewayResult> {
  const sessionRef = input.sessionRef.trim();
  if (!sessionRef) {
    return { ok: false, reason: "A session reference is required." };
  }

  const payment = await findOrderPayment(input.orderNumber);
  if (!payment) {
    return { ok: false, reason: "Order was not found." };
  }
  if (payment.provider !== input.provider) {
    return { ok: false, reason: "Payment provider does not match the order." };
  }
  if (payment.transactionRef !== sessionRef) {
    return { ok: false, reason: "Payment session does not match the order." };
  }
  if (payment.status === "PAID") {
    return { ok: false, reason: "A paid payment cannot be cancelled here." };
  }

  const applied = await applyPaymentTransition({
    paymentId: payment.id,
    next: input.next,
    failureReason: input.failureReason,
  });
  if (!applied.ok) {
    return applied;
  }
  return { ok: true, status: applied.status, paid: false };
}

async function findOrderPayment(orderNumber: string) {
  const number = orderNumber.trim();
  if (!number) {
    return null;
  }
  const order = await getPrisma().order.findUnique({
    where: { number },
    select: {
      payments: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          provider: true,
          status: true,
          transactionRef: true,
        },
      },
    },
  });
  return order?.payments[0] ?? null;
}
