/**
 * Staff in-app alerts for storefront → admin activity.
 *
 * Creates one IN_APP `Notification` per active staff member. The admin
 * topbar polls unread rows and plays a short chime. Browser Notification
 * API is optional (permission-gated).
 */
import { getPrisma } from "@/lib/db/prisma";
import { formatMoney } from "@/lib/format/currency";
import { usesDatabase } from "@/lib/runtime/data-source";

export const STAFF_ALERT_TYPES = {
  ORDER_PLACED: "order.placed",
  PRODUCT_REQUEST: "product_request.new",
  COMPLAINT: "complaint.new",
  TICKET_OPENED: "ticket.opened",
  TICKET_REPLY: "ticket.customer_reply",
  REVIEW_PENDING: "review.pending",
  QUESTION_PENDING: "question.pending",
  REFUND_REQUESTED: "refund.requested",
  NEWSLETTER_SUBSCRIBE: "newsletter.subscribe",
} as const;

export type StaffAlertType =
  (typeof STAFF_ALERT_TYPES)[keyof typeof STAFF_ALERT_TYPES];

/** @deprecated Prefer STAFF_ALERT_TYPES.ORDER_PLACED */
export const STAFF_ORDER_NOTIFICATION_TYPE = STAFF_ALERT_TYPES.ORDER_PLACED;

export type StaffAlert = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  readAt: string | null;
};

/** @deprecated Prefer StaffAlert */
export type StaffOrderAlert = StaffAlert;

export async function notifyStaff(input: {
  type: StaffAlertType | string;
  title: string;
  body: string;
  href: string;
}): Promise<void> {
  if (!usesDatabase()) {
    return;
  }
  const title = input.title.trim().slice(0, 160);
  const body = input.body.trim().slice(0, 400);
  const href = input.href.trim().slice(0, 200);
  const type = input.type.trim().slice(0, 80);
  if (!title || !type || !href.startsWith("/admin")) {
    return;
  }

  const prisma = getPrisma();
  const staff = await prisma.staff.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  if (staff.length === 0) {
    return;
  }

  const sentAt = new Date();
  await prisma.notification.createMany({
    data: staff.map((row) => ({
      staffId: row.id,
      channel: "IN_APP" as const,
      type,
      title,
      body: body || null,
      href,
      sentAt,
    })),
  });
}

/** Fire-and-forget — never fail the customer mutation. */
export function notifyStaffSafe(
  input: Parameters<typeof notifyStaff>[0],
): void {
  void notifyStaff(input).catch(() => {
    // Alert delivery must not affect storefront writes.
  });
}

/**
 * `orderId` is no longer needed: the alert links by order NUMBER, which is
 * what admin order URLs use and what the alert title already shows. It stays
 * in the signature because the href is PERSISTED on the `StaffAlert` row, so
 * alerts written before this change still carry a cuid path — those keep
 * working (the admin loader resolves either identifier) and are deliberately
 * not rewritten, since an alert is a record of something that happened.
 */
export async function notifyStaffOfNewOrder(input: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
}): Promise<void> {
  await notifyStaff({
    type: STAFF_ALERT_TYPES.ORDER_PLACED,
    title: `New order ${input.orderNumber}`,
    body: `${input.customerName} · ${formatMoney({
      amount: input.totalAmount,
    })}`,
    href: `/admin/orders/${encodeURIComponent(input.orderNumber)}`,
  });
}

export async function listStaffAlerts(
  staffId: string,
): Promise<{ unreadCount: number; items: StaffAlert[] }> {
  if (!usesDatabase()) {
    return { unreadCount: 0, items: [] };
  }
  const trimmed = staffId.trim();
  if (!trimmed) {
    return { unreadCount: 0, items: [] };
  }

  const [rows, unreadCount] = await Promise.all([
    getPrisma().notification.findMany({
      where: {
        staffId: trimmed,
        channel: "IN_APP",
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        href: true,
        createdAt: true,
        readAt: true,
      },
    }),
    getPrisma().notification.count({
      where: {
        staffId: trimmed,
        channel: "IN_APP",
        readAt: null,
      },
    }),
  ]);

  const items = rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body ?? "",
    href: row.href ?? "/admin",
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  }));

  return {
    unreadCount,
    items,
  };
}

/** @deprecated Prefer listStaffAlerts */
export const listStaffOrderAlerts = listStaffAlerts;

export async function markStaffAlertsRead(input: {
  staffId: string;
  ids?: string[];
}): Promise<void> {
  if (!usesDatabase()) {
    return;
  }
  const staffId = input.staffId.trim();
  if (!staffId) {
    return;
  }
  const ids = input.ids?.map((id) => id.trim()).filter(Boolean);
  await getPrisma().notification.updateMany({
    where: {
      staffId,
      channel: "IN_APP",
      readAt: null,
      ...(ids && ids.length > 0 ? { id: { in: ids } } : {}),
    },
    data: { readAt: new Date() },
  });
}

/** @deprecated Prefer markStaffAlertsRead */
export const markStaffOrderAlertsRead = markStaffAlertsRead;
