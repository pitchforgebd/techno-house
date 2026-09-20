"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import {
  hasPermission,
  PERMISSION_DENIED,
  staffWithPermission,
} from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import type { OrderFulfillmentStatus } from "@/lib/admin/orders-mock";
import {
  updateAdminOrder,
  type OrderMutationResult,
} from "@/lib/orders/admin-orders";
import { getPrisma } from "@/lib/db/prisma";
import {
  runBulkAction,
  type BulkActionResult,
} from "@/lib/admin/bulk-actions";
import { guardBulkOrigin } from "@/lib/admin/bulk-actions-server";

async function guardOrigin(): Promise<OrderMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

/** updateAdminOrder() replaces fulfillment/tracking/notes together — bulk
 * status changes must read each order's current tracking/notes first so a
 * bulk "mark shipped" can't silently wipe out what's already there. */
function dbStatusToFulfillment(
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED",
): OrderFulfillmentStatus {
  switch (status) {
    case "PROCESSING":
      return "processing";
    case "SHIPPED":
      return "shipped";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
      return "cancelled";
    default:
      return "pending";
  }
}

function revalidateOrderSurfaces() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/orders/unpaid");
  revalidatePath("/admin");
}

export async function bulkSetAdminOrdersPaymentStatusAction(
  ids: string[],
  paymentStatus: "paid" | "unpaid",
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("orders.payment_status");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  const result = await runBulkAction(ids, async (id) => {
    const existing = await getPrisma().order.findUnique({
      where: { id },
      select: { status: true, trackingCode: true, staffNotes: true },
    });
    if (!existing) {
      return { ok: false, formError: "That order no longer exists." };
    }
    return updateAdminOrder({
      id,
      fulfillmentStatus: dbStatusToFulfillment(existing.status),
      trackingCode: existing.trackingCode ?? "",
      staffNotes: existing.staffNotes ?? "",
      paymentStatus,
      actor,
    });
  });
  if (result.ok) {
    revalidateOrderSurfaces();
  }
  return result;
}

export async function bulkSetAdminOrdersFulfillmentStatusAction(
  ids: string[],
  fulfillmentStatus: OrderFulfillmentStatus,
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  const result = await runBulkAction(ids, async (id) => {
    const existing = await getPrisma().order.findUnique({
      where: { id },
      select: { trackingCode: true, staffNotes: true },
    });
    if (!existing) {
      return { ok: false, formError: "That order no longer exists." };
    }
    return updateAdminOrder({
      id,
      fulfillmentStatus,
      trackingCode: existing.trackingCode ?? "",
      staffNotes: existing.staffNotes ?? "",
      actor,
    });
  });
  if (result.ok) {
    revalidateOrderSurfaces();
  }
  return result;
}

export async function updateAdminOrderAction(input: {
  id: string;
  fulfillmentStatus: OrderFulfillmentStatus;
  trackingCode: string;
  staffNotes: string;
  deliveryBoy?: string;
  paymentStatus?: "paid" | "unpaid";
  /** Flat Taka amount, only applied on the confirming transition — see
   * `updateAdminOrder`'s doc comment. */
  discountAmount?: string;
}): Promise<OrderMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("orders.delivery_status");
  if (!allowed.ok) {
    return allowed;
  }
  if (
    input.paymentStatus !== undefined &&
    !hasPermission(allowed.session, "orders.payment_status")
  ) {
    return { ok: false, formError: PERMISSION_DENIED };
  }
  // Same gate as payment status — both change what the order is worth
  // financially, not just its fulfilment state.
  if (
    input.discountAmount !== undefined &&
    !hasPermission(allowed.session, "orders.payment_status")
  ) {
    return { ok: false, formError: PERMISSION_DENIED };
  }
  const meta = await getRequestMeta();
  const result = await updateAdminOrder({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/orders");
    revalidatePath("/admin/orders/unpaid");
    // Keyed on the order NUMBER, because that is what the admin URLs use now.
    // Revalidating the cuid path would silently miss, leaving a stale page
    // after every edit.
    revalidatePath(`/admin/orders/${result.number}`);
    revalidatePath(`/admin/orders/${result.number}/invoice`);
    revalidatePath("/admin");
  }
  return result;
}
