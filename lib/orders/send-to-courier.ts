/**
 * "Send to Pathao/Steadfast" (Admin → Orders, AD-253).
 *
 * Always re-fetches the order server-side (never trusts client-supplied
 * customer PII) and records the result on the existing `carrierId` /
 * `trackingCode` Order columns — the same fields Admin → Orders already
 * displays and the public order-tracking page already reads, previously
 * only ever filled in by hand.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { sendOrderToSteadfast } from "@/lib/shipping/couriers/steadfast";
import { sendOrderToPathao } from "@/lib/shipping/couriers/pathao";

export type SendToCourierResult =
  /**
   * `orderNumber` is the customer-facing Order ID, returned so the caller can
   * revalidate the right path. Admin order pages are served at
   * `/admin/orders/<number>`, not at the cuid, and a caller that only has the
   * internal id would revalidate a path nobody visits — leaving the order page
   * serving a cached version without the tracking code it just saved.
   */
  | { ok: true; trackingCode: string; orderNumber: string }
  | { ok: false; reason: string };

export type CourierActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

async function loadOrderForCourier(orderId: string) {
  const order = await getPrisma().order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      customerName: true,
      customerPhone: true,
      shippingAddress: true,
      totalAmount: true,
      paymentStatus: true,
      carrierId: true,
      notes: true,
    },
  });
  if (!order) {
    return null;
  }
  const codAmount = order.paymentStatus === "PAID" ? 0 : order.totalAmount;
  return { ...order, codAmount };
}

const CARRIER_NAMES: Record<"pathao" | "steadfast", string> = {
  pathao: "Pathao",
  steadfast: "Steadfast",
};

/** Order.carrierId is a real FK to ShippingCarrier — get-or-create the row. */
async function resolveCarrierId(provider: "pathao" | "steadfast"): Promise<string> {
  const row = await getPrisma().shippingCarrier.upsert({
    where: { code: provider },
    create: { code: provider, name: CARRIER_NAMES[provider] },
    update: {},
    select: { id: true },
  });
  return row.id;
}

async function recordCourierResult(input: {
  orderId: string;
  /** Customer-facing Order ID, recorded so the audit entry is readable. */
  orderNumber: string;
  provider: "pathao" | "steadfast";
  trackingCode: string;
  actor: CourierActor;
}): Promise<void> {
  const carrierId = await resolveCarrierId(input.provider);
  await getPrisma().order.update({
    where: { id: input.orderId },
    data: { carrierId, trackingCode: input.trackingCode },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.COURIER_ORDER_SENT,
    entityType: "Order",
    entityId: input.orderId,
    metadata: {
      orderNumber: input.orderNumber,
      provider: input.provider,
      trackingCode: input.trackingCode,
    },
    ip: input.actor.ip,
  });
}

export async function sendOrderToSteadfastCourier(input: {
  orderId: string;
  actor: CourierActor;
}): Promise<SendToCourierResult> {
  const order = await loadOrderForCourier(input.orderId);
  if (!order) {
    return { ok: false, reason: "Order was not found." };
  }
  if (order.carrierId) {
    return {
      ok: false,
      reason: `This order was already sent to a courier (${order.carrierId}).`,
    };
  }

  const sent = await sendOrderToSteadfast({
    invoice: order.number,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: order.shippingAddress,
    codAmount: order.codAmount,
    note: order.notes ?? undefined,
  });
  if (!sent.ok) {
    return { ok: false, reason: sent.reason };
  }

  await recordCourierResult({
    orderId: order.id,
    orderNumber: order.number,
    provider: "steadfast",
    trackingCode: sent.trackingCode || sent.consignmentId,
    actor: input.actor,
  });
  return {
    ok: true,
    trackingCode: sent.trackingCode || sent.consignmentId,
    orderNumber: order.number,
  };
}

export async function sendOrderToPathaoCourier(input: {
  orderId: string;
  cityId: number;
  zoneId: number;
  areaId: number;
  actor: CourierActor;
}): Promise<SendToCourierResult> {
  const order = await loadOrderForCourier(input.orderId);
  if (!order) {
    return { ok: false, reason: "Order was not found." };
  }
  if (order.carrierId) {
    return {
      ok: false,
      reason: `This order was already sent to a courier (${order.carrierId}).`,
    };
  }

  const sent = await sendOrderToPathao({
    invoice: order.number,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: order.shippingAddress,
    cityId: input.cityId,
    zoneId: input.zoneId,
    areaId: input.areaId,
    codAmount: order.codAmount,
    note: order.notes ?? undefined,
  });
  if (!sent.ok) {
    return { ok: false, reason: sent.reason };
  }

  await recordCourierResult({
    orderId: order.id,
    orderNumber: order.number,
    provider: "pathao",
    trackingCode: sent.trackingCode || sent.consignmentId,
    actor: input.actor,
  });
  return {
    ok: true,
    trackingCode: sent.trackingCode || sent.consignmentId,
    orderNumber: order.number,
  };
}
