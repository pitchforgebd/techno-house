/**
 * Post-placement per-line discounts an admin applies to an order (AD-379).
 *
 * A one-shot action per order: once any `OrderItem` on an order already
 * carries a discount, a further call is refused — use the Refunds tools for
 * any later adjustment, the same precedent `adminDiscountAmount`'s one-time
 * confirm-time discount already set (lib/orders/admin-orders.ts). This keeps
 * "what did the customer actually pay" answerable from Order/Payment/Refund
 * alone, with no risk of a second apply silently compounding or
 * under/over-refunding.
 *
 * If the order is already paid (in full or partially), the discount total is
 * paid back as a real refund through the existing, audited refund workflow
 * (lib/refunds/workflow.ts) — the same gateway/offline payout path a
 * staff-processed refund already uses, not a parallel money-moving
 * mechanism. An unpaid order just has its total reduced; nothing to refund
 * since nothing was collected yet.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { getOrderViewById } from "@/lib/orders/customer-orders";
import { sendCustomerDiscountInvoiceSafe } from "@/lib/orders/order-discount-email";
import {
  completeRefund,
  createAdminApprovedRefund,
  type RefundActor,
} from "@/lib/refunds/workflow";

export type ItemDiscountInput = {
  orderItemId: string;
  /** Taka, already computed from whatever % the admin typed — this module
   * only ever deals in absolute amounts (see computeWholesalePrice-style
   * convention used elsewhere, e.g. lib/b2b/pricing.ts). */
  discountAmount: number;
};

export type ApplyItemDiscountsResult =
  | { ok: true; totalDiscount: number; refundCode: string | null }
  | { ok: false; formError: string };

function fail(formError: string): ApplyItemDiscountsResult {
  return { ok: false, formError };
}

export async function applyOrderItemDiscounts(input: {
  orderId: string;
  discounts: ItemDiscountInput[];
  actor: RefundActor;
}): Promise<ApplyItemDiscountsResult> {
  const order = await getPrisma().order.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      number: true,
      status: true,
      totalAmount: true,
      paymentStatus: true,
      items: {
        select: { id: true, totalAmount: true, discountAmount: true },
      },
    },
  });
  if (!order) {
    return fail("That order no longer exists.");
  }
  if (order.status === "CANCELLED") {
    return fail("A cancelled order can't be discounted.");
  }

  const alreadyApplied = order.items.some((item) => item.discountAmount > 0);
  if (alreadyApplied) {
    return fail(
      "Item discounts were already applied to this order. Use the Refunds tools for any further adjustment.",
    );
  }

  const itemsById = new Map(order.items.map((item) => [item.id, item]));
  const clean: { id: string; amount: number }[] = [];
  for (const entry of input.discounts) {
    const amount = Math.round(entry.discountAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return fail("Enter a discount amount of 0 or more for every line.");
    }
    if (amount === 0) {
      continue;
    }
    const item = itemsById.get(entry.orderItemId);
    if (!item) {
      return fail("One of those products is no longer on this order.");
    }
    if (amount > item.totalAmount) {
      return fail("A line's discount can't be more than its own price.");
    }
    clean.push({ id: item.id, amount });
  }

  const totalDiscount = clean.reduce((sum, entry) => sum + entry.amount, 0);
  if (totalDiscount <= 0) {
    return fail("Enter at least one product discount greater than zero.");
  }
  if (totalDiscount > order.totalAmount) {
    return fail("The total discount can't be more than the order total.");
  }

  // Captured before anything is written — this is "what the order totalled
  // before this discount", used both for the Order.totalAmount write below
  // and for the "you saved X%" figure in the email.
  const originalTotalAmount = order.totalAmount;

  // Refund-before-write: if the order is already paid, the payout has to
  // succeed before the discount is recorded as applied — a failed gateway
  // call must never leave the invoice claiming a discount nobody was
  // actually paid back.
  let refundCode: string | null = null;
  const isPaid =
    order.paymentStatus === "PAID" ||
    order.paymentStatus === "PARTIALLY_REFUNDED";
  if (isPaid) {
    const created = await createAdminApprovedRefund({
      orderId: order.id,
      amount: totalDiscount,
      reasonText: `Per-product discount applied to order ${order.number}.`,
      actor: input.actor,
    });
    if (!created.ok) {
      return fail(created.reason);
    }
    const completed = await completeRefund({
      refundId: created.id,
      actor: input.actor,
    });
    if (!completed.ok) {
      return fail(completed.reason);
    }
    refundCode = completed.code;
  }

  await getPrisma().$transaction(async (tx) => {
    for (const entry of clean) {
      await tx.orderItem.update({
        where: { id: entry.id },
        data: { discountAmount: entry.amount },
      });
    }
    await tx.order.update({
      where: { id: order.id },
      data: { totalAmount: originalTotalAmount - totalDiscount },
    });
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.ORDER_ITEM_DISCOUNT_APPLY,
    entityType: "Order",
    entityId: order.id,
    metadata: {
      orderNumber: order.number,
      totalDiscount,
      lineCount: clean.length,
      refundCode,
    },
    ip: input.actor.ip,
  });

  try {
    const view = await getOrderViewById(order.id);
    if (view) {
      sendCustomerDiscountInvoiceSafe(view, {
        totalDiscount,
        originalTotalAmount,
      });
    }
  } catch {
    // The discount already saved — never fail the apply on notification
    // delivery, same precedent as order confirmation emails.
  }

  return { ok: true, totalDiscount, refundCode };
}
