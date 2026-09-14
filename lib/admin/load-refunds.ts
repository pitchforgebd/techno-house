import { CURRENCY_CODE } from "@/lib/format/currency";
import { ADMIN_ORDER_PAGE_SIZE } from "@/lib/admin/order-list-params";
import {
  MOCK_ADMIN_REFUNDS,
  type AdminRefund,
  type RefundPaymentChannel,
  type RefundStatus,
  type RefundTimelineActor,
} from "@/lib/admin/orders-mock";
import {
  matchesRefundTab,
  type AdminRefundListParams,
} from "@/lib/admin/refund-list-params";
import { getPrisma } from "@/lib/db/prisma";
import { usesRefundDatabase } from "@/lib/refunds/workflow";
import type {
  ActorType,
  RefundChannel,
  RefundPayoutStatus,
  RefundStatus as DbRefundStatus,
} from "@/lib/generated/prisma/enums";

export type AdminRefundListResult = {
  items: AdminRefund[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: AdminRefundListParams;
};

function toUiStatus(status: DbRefundStatus): RefundStatus {
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

function toChannel(
  channel: RefundChannel,
  provider: string | null,
): RefundPaymentChannel {
  if (channel === "OFFLINE") {
    return "offline";
  }
  if (channel === "WALLET") {
    return "wallet";
  }
  if (provider === "bkash") {
    return "bkash";
  }
  return "sslcommerz";
}

function toActor(type: ActorType): RefundTimelineActor {
  if (type === "STAFF") {
    return "admin";
  }
  if (type === "SYSTEM") {
    return "system";
  }
  return "customer";
}

function toAdminRefund(row: {
  id: string;
  code: string;
  orderId: string;
  amount: number;
  status: DbRefundStatus;
  reasonText: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
  channel: RefundChannel;
  payoutStatus: RefundPayoutStatus;
  isDispute: boolean;
  order: {
    number: string;
    customerName: string;
    items: { productName: string }[];
  };
  payment: { provider: string } | null;
  reason: { reason: string } | null;
  events: {
    id: string;
    actorType: ActorType;
    actorName: string;
    message: string;
    createdAt: Date;
  }[];
}): AdminRefund {
  const status = toUiStatus(row.status);
  return {
    id: row.id,
    code: row.code,
    orderId: row.orderId,
    orderNumber: row.order.number,
    customerName: row.order.customerName,
    productName: row.order.items[0]?.productName ?? "Order",
    amount: { amount: row.amount, currency: CURRENCY_CODE },
    status,
    reason: row.reasonText?.trim() || row.reason?.reason || "Refund requested",
    requestedAt: row.requestedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    paymentChannel: toChannel(row.channel, row.payment?.provider ?? null),
    payoutStatus: row.payoutStatus === "PAID" ? "paid" : "non_paid",
    isDispute: row.isDispute,
    timeline: row.events.map((event) => ({
      id: event.id,
      actor: toActor(event.actorType),
      actorName: event.actorName,
      at: event.createdAt.toISOString(),
      message: event.message,
      statusBadge: event.message.includes("rejected")
        ? "rejected"
        : event.message.includes("approved") ||
            event.message.includes("paid out")
          ? "approved"
          : event.message.includes("requested")
            ? "pending"
            : undefined,
    })),
  };
}

function mockList(params: AdminRefundListParams): AdminRefundListResult {
  let items = [...MOCK_ADMIN_REFUNDS].filter((refund) =>
    params.disputesOnly ? refund.isDispute : !refund.isDispute,
  );
  items = items.filter((refund) => matchesRefundTab(refund, params.tab));
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (refund) =>
        refund.code.toLowerCase().includes(q) ||
        refund.orderNumber.toLowerCase().includes(q) ||
        refund.customerName.toLowerCase().includes(q) ||
        refund.productName.toLowerCase().includes(q) ||
        refund.id.toLowerCase().includes(q),
    );
  }
  return paginate(items, params);
}

function paginate(
  items: AdminRefund[],
  params: AdminRefundListParams,
): AdminRefundListResult {
  const pageSize = ADMIN_ORDER_PAGE_SIZE;
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function loadAdminRefundList(
  params: AdminRefundListParams,
): Promise<AdminRefundListResult> {
  if (!usesRefundDatabase()) {
    return mockList(params);
  }

  const prisma = getPrisma();
  const rows = await prisma.refund.findMany({
    where: { isDispute: params.disputesOnly },
    orderBy: { requestedAt: "desc" },
    include: {
      order: {
        select: {
          number: true,
          customerName: true,
          items: {
            orderBy: { id: "asc" },
            take: 1,
            select: { productName: true },
          },
        },
      },
      payment: { select: { provider: true } },
      reason: { select: { reason: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  let items = rows.map(toAdminRefund);
  items = items.filter((refund) => matchesRefundTab(refund, params.tab));
  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (refund) =>
        refund.code.toLowerCase().includes(q) ||
        refund.orderNumber.toLowerCase().includes(q) ||
        refund.customerName.toLowerCase().includes(q) ||
        refund.productName.toLowerCase().includes(q) ||
        refund.id.toLowerCase().includes(q),
    );
  }
  return paginate(items, params);
}

export async function getAdminRefundById(
  id: string,
): Promise<AdminRefund | null> {
  if (!usesRefundDatabase()) {
    return MOCK_ADMIN_REFUNDS.find((refund) => refund.id === id) ?? null;
  }
  const row = await getPrisma().refund.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          number: true,
          customerName: true,
          items: {
            orderBy: { id: "asc" },
            take: 1,
            select: { productName: true },
          },
        },
      },
      payment: { select: { provider: true } },
      reason: { select: { reason: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
  return row ? toAdminRefund(row) : null;
}
