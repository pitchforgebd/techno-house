"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  applyOrderItemDiscounts,
  type ApplyItemDiscountsResult,
  type ItemDiscountInput,
} from "@/lib/orders/item-discounts";

/**
 * Gated on `refunds.process`, not an order-editing permission — this action
 * can move real money (a refund, for an already-paid order) exactly like
 * the existing refund-complete action does, so it gets the same permission
 * bar rather than the lighter one that covers tracking codes/staff notes.
 */
export async function applyOrderItemDiscountsAction(input: {
  orderId: string;
  orderNumber: string;
  discounts: ItemDiscountInput[];
}): Promise<ApplyItemDiscountsResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("refunds.process");
  if (!allowed.ok) {
    return { ok: false, formError: allowed.formError };
  }
  const meta = await getRequestMeta();

  const result = await applyOrderItemDiscounts({
    orderId: input.orderId,
    discounts: input.discounts,
    actor: {
      staffId: allowed.session.staffId,
      fullName: allowed.session.fullName,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });

  if (result.ok) {
    revalidatePath(`/admin/orders/${encodeURIComponent(input.orderNumber)}`);
    revalidatePath(
      `/admin/orders/${encodeURIComponent(input.orderNumber)}/invoice`,
    );
    revalidatePath("/admin/refunds");
  }

  return result;
}
