/**
 * Admin order mutations (fulfillment, tracking, staff notes, payment status).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
} from "@/lib/admin/orders-mock";
import { getPrisma } from "@/lib/db/prisma";
import {
  convertOrderStock,
  reReserveOrderStock,
  releaseOrderStock,
} from "@/lib/orders/stock-reservation";
import { usesDatabase } from "@/lib/runtime/data-source";
import type {
  OrderStatus as DbOrderStatus,
  PaymentStatus as DbPaymentStatus,
} from "@/lib/generated/prisma/enums";

export const ORDER_DB_REQUIRED =
  "Order updates need the database. Remove DATA_SOURCE=mock.";

export type OrderMutationResult =
  /**
   * `id` is the internal cuid; `number` is the customer-facing Order ID.
   *
   * Both are returned because they answer different questions. Callers that
   * revalidate a path need `number`, since admin order URLs are keyed on the
   * number a customer would quote. Callers doing further internal work keep
   * using `id`.
   */
  | { ok: true; id: string; number: string }
  | { ok: false; formError: string };

export type OrderActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const TRACKING_MAX = 80;
const NOTES_MAX = 1000;
const COURIER_MAX = 80;

type ManualPaymentStatus = "paid" | "unpaid";

function toDbStatus(status: OrderFulfillmentStatus): DbOrderStatus {
  switch (status) {
    case "processing":
      return "PROCESSING";
    case "shipped":
      return "SHIPPED";
    case "delivered":
      return "DELIVERED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

function toDbPayment(status: ManualPaymentStatus): DbPaymentStatus {
  return status === "paid" ? "PAID" : "PENDING";
}

function fail(formError: string): OrderMutationResult {
  return { ok: false, formError };
}

function parseManualPayment(
  value: string | undefined,
): ManualPaymentStatus | null {
  if (value === "paid" || value === "unpaid") {
    return value;
  }
  return null;
}

export async function updateAdminOrder(input: {
  id: string;
  fulfillmentStatus: OrderFulfillmentStatus;
  trackingCode: string;
  staffNotes: string;
  deliveryBoy?: string;
  /** Staff offline / COD override — paid or unpaid only. */
  paymentStatus?: OrderPaymentStatus | ManualPaymentStatus;
  actor?: OrderActor;
}): Promise<OrderMutationResult> {
  if (!usesDatabase()) {
    return fail(ORDER_DB_REQUIRED);
  }
  const id = input.id.trim();
  if (!id) {
    return fail("That order no longer exists.");
  }

  const existing = await getPrisma().order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      paymentStatus: true,
      confirmedAt: true,
      shippedAt: true,
      deliveredAt: true,
      cancelledAt: true,
      payments: {
        orderBy: { createdAt: "desc" as const },
        take: 1,
        select: { id: true, status: true },
      },
    },
  });
  if (!existing) {
    return fail("That order no longer exists.");
  }

  const status = toDbStatus(input.fulfillmentStatus);
  const trackingCode = input.trackingCode
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, TRACKING_MAX);
  const courier = (input.deliveryBoy ?? "")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, COURIER_MAX);
  let staffNotes = input.staffNotes.replace(/[<>]/g, "").trim().slice(0, NOTES_MAX);
  if (courier) {
    const withoutCourier = staffNotes
      .split("\n")
      .filter((line) => !/^Delivery:\s*/i.test(line))
      .join("\n")
      .trim();
    staffNotes = [`Delivery: ${courier}`, withoutCourier]
      .filter(Boolean)
      .join("\n")
      .slice(0, NOTES_MAX);
  }

  let nextPayment: DbPaymentStatus | null = null;
  if (input.paymentStatus !== undefined) {
    const manual = parseManualPayment(input.paymentStatus);
    if (!manual) {
      return fail("Choose Paid or Unpaid.");
    }
    if (
      existing.paymentStatus === "REFUNDED" ||
      existing.paymentStatus === "PARTIALLY_REFUNDED"
    ) {
      return fail(
        "Refunded orders keep payment status — use the refund tools.",
      );
    }
    nextPayment = toDbPayment(manual);
  }

  const now = new Date();
  const data: {
    status: DbOrderStatus;
    trackingCode: string | null;
    staffNotes: string | null;
    paymentStatus?: DbPaymentStatus;
    confirmedAt?: Date | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
    cancelledAt?: Date | null;
  } = {
    status,
    trackingCode: trackingCode || null,
    staffNotes: staffNotes || null,
  };

  if (nextPayment) {
    data.paymentStatus = nextPayment;
  }

  if (status === "PROCESSING" && !existing.confirmedAt) {
    data.confirmedAt = now;
  }
  if (status === "SHIPPED") {
    data.shippedAt = existing.shippedAt ?? now;
    if (!existing.confirmedAt) {
      data.confirmedAt = now;
    }
  }
  if (status === "DELIVERED") {
    data.deliveredAt = existing.deliveredAt ?? now;
    if (!existing.shippedAt) {
      data.shippedAt = now;
    }
    if (!existing.confirmedAt) {
      data.confirmedAt = now;
    }
  }
  if (status === "CANCELLED") {
    data.cancelledAt = existing.cancelledAt ?? now;
  }
  if (status === "PENDING") {
    data.cancelledAt = null;
  }

  const paymentRow = existing.payments[0];

  await getPrisma().$transaction(async (tx) => {
    await tx.order.update({
      where: { id: existing.id },
      data,
    });

    // Inventory follows the fulfilment state (DSA-02). Before this, cancelling
    // an order left its units reserved forever and delivering one never turned
    // the reservation into a real stock decrement, so availability only ever
    // fell. Each helper claims `Order.stockState` atomically, so running twice
    // — or from the payment path as well — adjusts stock only once.
    if (status === "CANCELLED") {
      await releaseOrderStock(tx, existing.id);
    } else if (status === "DELIVERED") {
      await convertOrderStock(tx, existing.id);
    } else {
      // Reopening a cancelled order has to take its units back.
      await reReserveOrderStock(tx, existing.id);
    }

    if (
      nextPayment &&
      paymentRow &&
      paymentRow.status !== "REFUNDED" &&
      paymentRow.status !== "PARTIALLY_REFUNDED"
    ) {
      await tx.payment.update({
        where: { id: paymentRow.id },
        data: {
          status: nextPayment,
          paidAt: nextPayment === "PAID" ? now : null,
          failureReason: null,
        },
      });
    }
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ORDER_UPDATE,
      entityType: "Order",
      entityId: existing.id,
      metadata: {
        // `orderNumber` is the key every order audit entry uses, so the log
        // view can find it without knowing which action wrote the row.
        orderNumber: existing.number,
        status,
        trackingCode: trackingCode || null,
        ...(nextPayment
          ? {
              paymentStatus: nextPayment,
              previousPaymentStatus: existing.paymentStatus,
            }
          : {}),
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: existing.id, number: existing.number };
}
