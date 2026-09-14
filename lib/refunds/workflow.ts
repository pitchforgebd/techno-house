/**
 * Refund workflow (P13-T06).
 *
 * Customer request → eligibility → staff approval → gateway/offline payout
 * → payment status. The browser cannot complete a refund.
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  notifyStaffSafe,
  STAFF_ALERT_TYPES,
} from "@/lib/orders/staff-order-alerts";
import { refundBkashPayment } from "@/lib/payments/bkash";
import { paymentTransitionError } from "@/lib/payments/status";
import { refundSslcommerzPayment } from "@/lib/payments/sslcommerz";
import { createRefundCode } from "@/lib/refunds/codes";
import {
  refundWindowDeadline,
  resolveRefundWindowDays,
} from "@/lib/refunds/settings";
import { refundTransitionError } from "@/lib/refunds/status";
import type {
  ActorType,
  PaymentStatus,
  RefundChannel,
  RefundStatus,
} from "@/lib/generated/prisma/enums";

export const REFUND_DB_REQUIRED =
  "Refunds need the database. Turn off DATA_SOURCE=mock to continue.";

const REASON_TEXT_MAX = 400;

export type RefundMutationResult =
  { ok: true; id: string; code: string } | { ok: false; reason: string };

export type RefundActor = {
  staffId: string;
  fullName: string;
  email: string;
  ip?: string | null;
};

export type CustomerRefundView = {
  code: string;
  amount: number;
  status: "requested" | "approved" | "rejected" | "completed";
  reason: string;
  requestedAt: string;
};

export type CustomerRefundReasonView = {
  id: string;
  reason: string;
};

export function usesRefundDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

/** Carries a user-facing reason out of the refund-request transaction. */
class RefundRequestError extends Error {}

function fail(reason: string): RefundMutationResult {
  return { ok: false, reason };
}

function toCustomerStatus(status: RefundStatus): CustomerRefundView["status"] {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "COMPLETED":
      return "completed";
    default:
      return "requested";
  }
}

function channelForProvider(provider: string): RefundChannel {
  return provider === "cod" ? "OFFLINE" : "GATEWAY";
}

async function refundableRemaining(orderId: string, paymentAmount: number) {
  const completed = await getPrisma().refund.aggregate({
    where: { orderId, status: "COMPLETED" },
    _sum: { amount: true },
  });
  return Math.max(0, paymentAmount - (completed._sum.amount ?? 0));
}

async function addEvent(input: {
  refundId: string;
  actorType: ActorType;
  actorName: string;
  message: string;
}) {
  await getPrisma().refundEvent.create({ data: input });
}

async function applyPaymentRefundStatus(input: {
  paymentId: string;
  orderId: string;
  paymentAmount: number;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const prisma = getPrisma();
  const remaining = await refundableRemaining(
    input.orderId,
    input.paymentAmount,
  );
  const next: PaymentStatus =
    remaining === 0 ? "REFUNDED" : "PARTIALLY_REFUNDED";

  try {
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${input.paymentId} FOR UPDATE`;
      const locked = await tx.payment.findUnique({
        where: { id: input.paymentId },
        select: { status: true },
      });
      if (!locked) {
        throw new Error("Payment was not found.");
      }
      if (locked.status !== next) {
        const illegal = paymentTransitionError(locked.status, next);
        if (illegal) {
          throw new Error(illegal);
        }
        await tx.payment.update({
          where: { id: input.paymentId },
          data: { status: next },
        });
        await tx.order.update({
          where: { id: input.orderId },
          data: { paymentStatus: next },
        });
      }
    });
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Error
          ? error.message
          : "Payment could not be updated.",
    };
  }
}

export async function listCustomerRefundReasons(): Promise<
  CustomerRefundReasonView[]
> {
  if (!usesRefundDatabase()) {
    return [];
  }
  const rows = await getPrisma().refundReason.findMany({
    where: { isActive: true, type: "CUSTOMER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, reason: true },
  });
  return rows;
}

export async function listCustomerRefunds(
  orderNumber: string,
): Promise<CustomerRefundView[]> {
  if (!usesRefundDatabase()) {
    return [];
  }
  const session = await getCustomerSession();
  if (!session) {
    return [];
  }
  const order = await getPrisma().order.findFirst({
    where: { number: orderNumber.trim(), userId: session.userId },
    select: {
      refunds: {
        orderBy: { requestedAt: "desc" },
        include: { reason: { select: { reason: true } } },
      },
    },
  });
  return (order?.refunds ?? []).map((row) => ({
    code: row.code,
    amount: row.amount,
    status: toCustomerStatus(row.status),
    reason: row.reasonText?.trim() || row.reason?.reason || "Refund requested",
    requestedAt: row.requestedAt.toISOString(),
  }));
}

export async function requestCustomerRefund(input: {
  orderNumber: string;
  amount: number;
  reasonId: string | null;
  reasonText: string;
}): Promise<RefundMutationResult> {
  const session = await getCustomerSession();
  if (!session) {
    return fail("Sign in to request a refund.");
  }
  return requestRefundForUser(session.userId, input);
}

export async function requestRefundForUser(
  userId: string,
  input: {
    orderNumber: string;
    amount: number;
    reasonId: string | null;
    reasonText: string;
  },
): Promise<RefundMutationResult> {
  if (!usesRefundDatabase()) {
    return fail(REFUND_DB_REQUIRED);
  }

  const prisma = getPrisma();
  const order = await prisma.order.findFirst({
    where: { number: input.orderNumber.trim(), userId },
    include: {
      payments: { orderBy: { createdAt: "asc" }, take: 1 },
      items: {
        select: {
          product: { select: { category: { select: { slug: true } } } },
        },
      },
    },
  });
  if (!order || !order.payments[0]) {
    return fail("Order was not found.");
  }
  const payment = order.payments[0];
  if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
    return fail("Only a paid order can be refunded.");
  }

  const categorySlugs = [
    ...new Set(
      order.items
        .map((item) => item.product?.category?.slug)
        .filter((slug): slug is string => Boolean(slug)),
    ),
  ];
  const windowDays = await resolveRefundWindowDays({ categorySlugs });
  const anchor = order.deliveredAt ?? order.placedAt;
  if (Date.now() > refundWindowDeadline(anchor, windowDays).getTime()) {
    return fail(
      windowDays <= 0
        ? "This order is not eligible for a refund request."
        : `The refund request window (${windowDays} days) has ended.`,
    );
  }

  const remaining = await refundableRemaining(order.id, payment.amount);
  if (
    !Number.isInteger(input.amount) ||
    input.amount < 1 ||
    input.amount > remaining
  ) {
    return fail("Refund amount is not valid.");
  }

  // The open-refund check and the create below run together under a lock on
  // the order row (DSA-07). Previously they were two unrelated statements, so
  // concurrent requests all saw "no open refund" and all created one — which
  // then let several approved refunds each pass `completeRefund`'s remaining-
  // amount check and together exceed the payment. The partial unique index
  // `Refund_one_open_per_order` is the structural backstop underneath this.

  let reasonId: string | null = null;
  if (input.reasonId?.trim()) {
    const reason = await prisma.refundReason.findFirst({
      where: {
        id: input.reasonId.trim(),
        isActive: true,
        type: "CUSTOMER",
      },
      select: { id: true },
    });
    if (!reason) {
      return fail("Choose a valid refund reason.");
    }
    reasonId = reason.id;
  }

  const reasonText = input.reasonText.trim().slice(0, REASON_TEXT_MAX);
  const code = createRefundCode();

  let created: { id: string; code: string };
  try {
    created = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${order.id} FOR UPDATE`;

      const open = await tx.refund.findFirst({
        where: {
          orderId: order.id,
          status: { in: ["REQUESTED", "APPROVED"] },
        },
        select: { id: true },
      });
      if (open) {
        throw new RefundRequestError(
          "A refund is already in progress for this order.",
        );
      }

      return tx.refund.create({
        data: {
          code,
          orderId: order.id,
          paymentId: payment.id,
          requestedById: userId,
          reasonId,
          amount: input.amount,
          currency: "BDT",
          status: "REQUESTED",
          channel: channelForProvider(payment.provider),
          payoutStatus: "PENDING",
          reasonText: reasonText || null,
        },
        select: { id: true, code: true },
      });
    });
  } catch (error) {
    if (error instanceof RefundRequestError) {
      return fail(error.message);
    }
    // The partial unique index caught a racer the lock did not.
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return fail("A refund is already in progress for this order.");
    }
    throw error;
  }
  await addEvent({
    refundId: created.id,
    actorType: "CUSTOMER",
    actorName: order.customerName,
    message: `Refund ${created.code} requested for ${input.amount} BDT.`,
  });
  await writeAuditLog({
    actorType: "CUSTOMER",
    actorId: userId,
    actorLabel: order.customerName,
    action: AUDIT_ACTIONS.REFUND_REQUEST,
    entityType: "Refund",
    entityId: created.id,
    metadata: {
      code: created.code,
      orderNumber: order.number,
      amount: input.amount,
    },
  });
  notifyStaffSafe({
    type: STAFF_ALERT_TYPES.REFUND_REQUESTED,
    title: `Refund request ${created.code}`,
    body: `${order.customerName} · order ${order.number} · ${input.amount} BDT`,
    href: `/admin/refunds`,
  });
  return { ok: true, id: created.id, code: created.code };
}

export async function decideRefund(input: {
  refundId: string;
  next: "APPROVED" | "REJECTED";
  actor: RefundActor;
  reasonId?: string | null;
}): Promise<RefundMutationResult> {
  if (!usesRefundDatabase()) {
    return fail(REFUND_DB_REQUIRED);
  }
  const prisma = getPrisma();
  const refund = await prisma.refund.findUnique({
    where: { id: input.refundId },
    include: { order: { select: { number: true } } },
  });
  if (!refund) {
    return fail("Refund was not found.");
  }
  const illegal = refundTransitionError(refund.status, input.next);
  if (illegal) {
    return fail(illegal);
  }
  if (refund.payoutStatus === "PAID") {
    return fail("A paid-out refund cannot be changed.");
  }

  let reasonId = refund.reasonId;
  if (input.next === "REJECTED" && input.reasonId?.trim()) {
    const reason = await prisma.refundReason.findFirst({
      where: {
        id: input.reasonId.trim(),
        isActive: true,
        type: "STAFF",
      },
      select: { id: true },
    });
    if (!reason) {
      return fail("Choose a valid reject reason.");
    }
    reasonId = reason.id;
  }

  await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: input.next,
      approvedById: input.actor.staffId,
      reasonId,
      resolvedAt: input.next === "REJECTED" ? new Date() : refund.resolvedAt,
    },
  });
  await addEvent({
    refundId: refund.id,
    actorType: "STAFF",
    actorName: input.actor.fullName,
    message:
      input.next === "APPROVED"
        ? `Refund ${refund.code} approved.`
        : `Refund ${refund.code} rejected.`,
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action:
      input.next === "APPROVED"
        ? AUDIT_ACTIONS.REFUND_APPROVE
        : AUDIT_ACTIONS.REFUND_REJECT,
    entityType: "Refund",
    entityId: refund.id,
    metadata: { code: refund.code, orderNumber: refund.order.number },
    ip: input.actor.ip,
  });
  return { ok: true, id: refund.id, code: refund.code };
}

export async function completeRefund(input: {
  refundId: string;
  actor: RefundActor;
}): Promise<RefundMutationResult> {
  if (!usesRefundDatabase()) {
    return fail(REFUND_DB_REQUIRED);
  }
  const prisma = getPrisma();
  const refund = await prisma.refund.findUnique({
    where: { id: input.refundId },
    include: {
      order: { select: { id: true, number: true } },
      payment: {
        select: {
          id: true,
          provider: true,
          amount: true,
          status: true,
          transactionRef: true,
          sessionRef: true,
        },
      },
    },
  });
  if (!refund) {
    return fail("Refund was not found.");
  }
  if (refund.status === "COMPLETED") {
    // The payout already happened (real money moved) and `refund` itself is
    // marked done, but a *previous* call may have failed after that — right
    // between here and returning — to sync Payment/Order status (see the
    // comment on `applyPaymentRefundStatus` below). Retrying that sync is
    // safe and idempotent (it only writes when statuses actually differ), so
    // do it here rather than silently leaving Payment/Order stale forever —
    // this is the only path that can ever retry it, since every other path
    // into this function short-circuits on `refund.status === "COMPLETED"`.
    if (refund.payment) {
      const paymentUpdated = await applyPaymentRefundStatus({
        paymentId: refund.payment.id,
        orderId: refund.orderId,
        paymentAmount: refund.payment.amount,
      });
      if (!paymentUpdated.ok) {
        return paymentUpdated;
      }
    }
    return { ok: true, id: refund.id, code: refund.code };
  }
  const illegal = refundTransitionError(refund.status, "COMPLETED");
  if (illegal) {
    return fail(illegal);
  }
  if (!refund.payment) {
    return fail("Payment was not found.");
  }
  if (
    refund.payment.status !== "PAID" &&
    refund.payment.status !== "PARTIALLY_REFUNDED"
  ) {
    return fail("Only a paid payment can be refunded.");
  }

  const remaining = await refundableRemaining(
    refund.orderId,
    refund.payment.amount,
  );
  if (refund.amount > remaining) {
    return fail("Refund amount is no longer available.");
  }

  let payoutRef = refund.payoutRef;
  if (!payoutRef) {
    // Claim the payout before spending any money (DSA-04).
    //
    // Everything above is a read-then-check against unlocked rows, so two
    // concurrent completions both used to reach `payoutRefund` and the gateway
    // was charged twice. `payoutRef @unique` did not help: it is only consulted
    // after the money has already moved, and two gateway calls return two
    // different references anyway.
    //
    // This single conditional write is the serialisation point. Exactly one
    // caller can move a refund PENDING -> PROCESSING, so exactly one caller
    // reaches the gateway. It is deliberately NOT wrapped in a transaction
    // spanning the gateway call — holding a row lock across a 15s HTTP timeout
    // would block the whole refund queue.
    const claimed = await prisma.refund.updateMany({
      where: {
        id: refund.id,
        status: "APPROVED",
        payoutStatus: "PENDING",
        payoutRef: null,
      },
      data: { payoutStatus: "PROCESSING" },
    });
    if (claimed.count !== 1) {
      return fail(
        "This refund is already being paid out. Refresh in a moment to see the result.",
      );
    }

    const paidOut = await payoutRefund({
      code: refund.code,
      amount: refund.amount,
      channel: refund.channel,
      reasonText: refund.reasonText,
      payment: refund.payment,
    });
    if (!paidOut.ok) {
      // Hand the claim back so staff can retry.
      //
      // Worth being explicit about the residual risk: `gatewayFetch` reports a
      // timeout and a refused request identically, so a payout that actually
      // succeeded but whose response was lost lands here too. SSLCommerz is
      // covered — `refundSslcommerzPayment` sends `refund_trans_id =
      // refund.code`, a merchant-supplied idempotency key, so a retry with the
      // same code cannot pay twice. bKash is NOT known to dedupe this way, so
      // a retried bKash refund after a lost response is the one case still
      // worth verifying at the gateway first.
      await prisma.refund.updateMany({
        where: { id: refund.id, payoutStatus: "PROCESSING" },
        data: { payoutStatus: "PENDING" },
      });
      return paidOut;
    }
    payoutRef = paidOut.ref;
  }

  // Deliberately its own statement, not folded into `applyPaymentRefundStatus`'s
  // transaction below. `payoutRefund` above already sent real money and is not
  // retried once `payoutRef` is set (see the `if (!payoutRef)` guard) — so this
  // write recording that must commit and MUST NOT be rolled back by a later
  // failure to sync Payment/Order, or a retry would call `payoutRefund` again
  // and pay out twice. If the sync below fails, the "already COMPLETED" branch
  // above is what retries it on a later call.
  await prisma.refund.update({
    where: { id: refund.id },
    data: {
      status: "COMPLETED",
      payoutStatus: "PAID",
      payoutRef,
      approvedById: input.actor.staffId,
      resolvedAt: new Date(),
    },
  });

  const paymentUpdated = await applyPaymentRefundStatus({
    paymentId: refund.payment.id,
    orderId: refund.orderId,
    paymentAmount: refund.payment.amount,
  });
  if (!paymentUpdated.ok) {
    return paymentUpdated;
  }

  await addEvent({
    refundId: refund.id,
    actorType: "STAFF",
    actorName: input.actor.fullName,
    message: `Refund ${refund.code} paid out.`,
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.REFUND_COMPLETE,
    entityType: "Refund",
    entityId: refund.id,
    metadata: { code: refund.code, orderNumber: refund.order.number },
    ip: input.actor.ip,
  });
  return { ok: true, id: refund.id, code: refund.code };
}

async function payoutRefund(refund: {
  code: string;
  amount: number;
  channel: RefundChannel;
  reasonText: string | null;
  payment: {
    provider: string;
    transactionRef: string | null;
    sessionRef: string | null;
  };
}): Promise<{ ok: true; ref: string } | { ok: false; reason: string }> {
  if (refund.channel === "OFFLINE" || refund.payment.provider === "cod") {
    return { ok: true, ref: `offline:${refund.code}` };
  }
  if (refund.payment.provider === "sslcommerz") {
    const bankTranId = refund.payment.transactionRef?.trim() ?? "";
    if (!bankTranId) {
      return {
        ok: false,
        reason: "SSLCommerz refund needs a transaction reference.",
      };
    }
    return refundSslcommerzPayment({
      bankTranId,
      amount: refund.amount,
      remarks: refund.reasonText || refund.code,
      refundCode: refund.code,
    });
  }
  if (refund.payment.provider === "bkash") {
    const trxID = refund.payment.transactionRef?.trim() ?? "";
    const paymentID = refund.payment.sessionRef?.trim() ?? "";
    if (!trxID || !paymentID) {
      return {
        ok: false,
        reason: "bKash refund needs the original payment session.",
      };
    }
    return refundBkashPayment({
      paymentID,
      trxID,
      amount: refund.amount,
      reason: refund.reasonText || refund.code,
    });
  }
  return { ok: false, reason: "This payment method cannot be refunded here." };
}

export async function remainingRefundableForOrder(
  orderNumber: string,
): Promise<number> {
  if (!usesRefundDatabase()) {
    return 0;
  }
  const session = await getCustomerSession();
  if (!session) {
    return 0;
  }
  const order = await getPrisma().order.findFirst({
    where: { number: orderNumber.trim(), userId: session.userId },
    include: {
      payments: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  const payment = order?.payments[0];
  if (
    !order ||
    !payment ||
    (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED")
  ) {
    return 0;
  }
  return refundableRemaining(order.id, payment.amount);
}
