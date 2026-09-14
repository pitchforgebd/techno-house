/**
 * Admin order reads (wired to PostgreSQL when DATA_SOURCE ≠ mock).
 *
 * Checkout writes real `Order` rows; the list/detail UI must read the same
 * source. Mock rows remain only for `DATA_SOURCE=mock`.
 */
import {
  MOCK_ADMIN_ORDERS,
  MOCK_ADMIN_REFUNDS,
  type AdminOrder,
  type AdminOrderLine,
  type OrderFulfillmentStatus,
  type OrderPaymentStatus,
} from "@/lib/admin/orders-mock";
import {
  ADMIN_ORDER_PAGE_SIZE,
  type AdminOrderListParams,
} from "@/lib/admin/order-list-params";
import { paymentMethodLabel } from "@/lib/cart/payment";
import type { Money } from "@/lib/data/types/common";
import { getPrisma } from "@/lib/db/prisma";
import type {
  OrderStatus as DbOrderStatus,
  PaymentStatus as DbPaymentStatus,
  RefundStatus as DbRefundStatus,
} from "@/lib/generated/prisma/enums";

export type AdminOrderListResult = {
  items: AdminOrder[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: AdminOrderListParams;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function money(amount: number): Money {
  return { amount, currency: "BDT" };
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) {
    return phone;
  }
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}

function formatPlacedAt(value: Date): { label: string; sort: string } {
  const sort = value.toISOString();
  const label = value.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { label: label.replace(",", " ·"), sort };
}

function toFulfillment(status: DbOrderStatus): OrderFulfillmentStatus {
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

function toPayment(status: DbPaymentStatus): OrderPaymentStatus {
  switch (status) {
    case "PAID":
      return "paid";
    case "FAILED":
    case "CANCELLED":
      return "failed";
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return "refunded";
    default:
      return "unpaid";
  }
}

function toDbFulfillment(status: OrderFulfillmentStatus): DbOrderStatus {
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

function toDbPaymentFilter(status: OrderPaymentStatus): DbPaymentStatus[] {
  switch (status) {
    case "paid":
      return ["PAID"];
    case "failed":
      return ["FAILED", "CANCELLED"];
    case "refunded":
      return ["REFUNDED", "PARTIALLY_REFUNDED"];
    case "unpaid":
      return ["PENDING", "PROCESSING"];
    default:
      return [];
  }
}

function refundLabelFromStatuses(statuses: DbRefundStatus[]): string {
  if (statuses.length === 0) {
    return "No Refund";
  }
  if (statuses.some((s) => s === "COMPLETED")) {
    return "Refunded";
  }
  if (statuses.some((s) => s === "REQUESTED" || s === "APPROVED")) {
    return "Refund Pending";
  }
  if (statuses.some((s) => s === "REJECTED")) {
    return "Refund Rejected";
  }
  return "No Refund";
}

const orderSelect = {
  id: true,
  number: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  placedAt: true,
  status: true,
  paymentStatus: true,
  totalAmount: true,
  shippingMethodLabel: true,
  shippingAddress: true,
  notes: true,
  staffNotes: true,
  trackingCode: true,
  carrier: { select: { code: true, name: true } },
  items: {
    orderBy: { id: "asc" as const },
    select: {
      id: true,
      productName: true,
      sku: true,
      quantity: true,
      unitAmount: true,
      colorName: true,
      colorHex: true,
      buildBatchId: true,
    },
  },
  payments: {
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { method: true, provider: true },
  },
  refunds: {
    orderBy: { requestedAt: "desc" as const },
    select: { status: true },
  },
} as const;

type OrderRow = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  placedAt: Date;
  status: DbOrderStatus;
  paymentStatus: DbPaymentStatus;
  totalAmount: number;
  shippingMethodLabel: string | null;
  shippingAddress: string;
  notes: string | null;
  staffNotes: string | null;
  trackingCode: string | null;
  carrier: { code: string; name: string } | null;
  items: {
    id: string;
    productName: string;
    sku: string;
    quantity: number;
    unitAmount: number;
    colorName: string | null;
    colorHex: string | null;
    buildBatchId: string | null;
  }[];
  payments: { method: string | null; provider: string }[];
  refunds: { status: DbRefundStatus }[];
};

function toAdminOrder(row: OrderRow, options?: { maskPhone?: boolean }): AdminOrder {
  const placed = formatPlacedAt(row.placedAt);
  const hours = (Date.now() - row.placedAt.getTime()) / (1000 * 60 * 60);
  const lines: AdminOrderLine[] = row.items.map((item) => ({
    id: item.id,
    productName: item.productName,
    sku: item.sku,
    quantity: item.quantity,
    unitPrice: money(item.unitAmount),
    colorName: item.colorName,
    colorHex: item.colorHex,
    buildBatchId: item.buildBatchId,
  }));
  const methodId = row.payments[0]?.method ?? row.payments[0]?.provider ?? null;

  return {
    id: row.id,
    number: row.number,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone:
      options?.maskPhone === false
        ? row.customerPhone
        : maskPhone(row.customerPhone),
    placedAt: placed.label,
    placedAtSort: placed.sort,
    total: money(row.totalAmount),
    paymentStatus: toPayment(row.paymentStatus),
    paymentMethod: paymentMethodLabel(methodId),
    fulfillmentStatus: toFulfillment(row.status),
    shippingMethod: row.shippingMethodLabel ?? "—",
    shippingAddress: row.shippingAddress,
    notes: row.notes,
    staffNotes: row.staffNotes,
    trackingCode: row.trackingCode,
    carrierId: row.carrier?.code ?? null,
    isNew: hours < 24 && row.status === "PENDING",
    refundLabel: refundLabelFromStatuses(row.refunds.map((r) => r.status)),
    lines,
  };
}

function filterMockList(params: AdminOrderListParams): AdminOrder[] {
  let items = MOCK_ADMIN_ORDERS.map((order) => ({
    ...order,
    refundLabel: getOrderRefundLabel(order.id),
  }));

  if (params.unpaidOnly) {
    items = items.filter((order) => order.paymentStatus === "unpaid");
  } else if (params.payment !== "all") {
    items = items.filter((order) => order.paymentStatus === params.payment);
  }

  if (params.fulfillment !== "all") {
    items = items.filter(
      (order) => order.fulfillmentStatus === params.fulfillment,
    );
  }

  if (params.date) {
    items = items.filter((order) =>
      order.placedAtSort.startsWith(params.date),
    );
  }

  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (order) =>
        order.number.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerEmail.toLowerCase().includes(q),
    );
  }

  items.sort((a, b) => b.placedAtSort.localeCompare(a.placedAtSort));
  return items;
}

export async function loadAdminOrderList(
  params: AdminOrderListParams,
): Promise<AdminOrderListResult> {
  const pageSize = ADMIN_ORDER_PAGE_SIZE;

  if (!usesDatabase()) {
    const items = filterMockList(params);
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

  const where: {
    paymentStatus?: { in: DbPaymentStatus[] };
    status?: DbOrderStatus;
    placedAt?: { gte: Date; lt: Date };
    OR?: {
      number?: { contains: string; mode: "insensitive" };
      customerName?: { contains: string; mode: "insensitive" };
      customerEmail?: { contains: string; mode: "insensitive" };
    }[];
  } = {};

  if (params.unpaidOnly || params.payment === "unpaid") {
    where.paymentStatus = { in: toDbPaymentFilter("unpaid") };
  } else if (params.payment !== "all") {
    where.paymentStatus = { in: toDbPaymentFilter(params.payment) };
  }

  if (params.fulfillment !== "all") {
    where.status = toDbFulfillment(params.fulfillment);
  }

  if (params.date) {
    const day = params.date.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      const gte = new Date(`${day}T00:00:00.000Z`);
      const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
      where.placedAt = { gte, lt };
    }
  }

  if (params.q) {
    where.OR = [
      { number: { contains: params.q, mode: "insensitive" } },
      { customerName: { contains: params.q, mode: "insensitive" } },
      { customerEmail: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const prisma = getPrisma();
  const total = await prisma.order.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: orderSelect,
  });

  return {
    items: rows.map((row) => toAdminOrder(row)),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function getAdminOrderById(id: string): Promise<AdminOrder | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  if (!usesDatabase()) {
    const order = MOCK_ADMIN_ORDERS.find((row) => row.id === trimmed) ?? null;
    if (!order) {
      return null;
    }
    return { ...order, refundLabel: getOrderRefundLabel(order.id) };
  }

  const row = await getPrisma().order.findFirst({
    where: {
      OR: [{ id: trimmed }, { number: trimmed }],
    },
    select: orderSelect,
  });
  if (!row) {
    return null;
  }
  return toAdminOrder(row, { maskPhone: false });
}

/** Sync mock helper for modules that still use mock customers. */
export function getOrderRefundLabel(orderId: string): string {
  const refunds = MOCK_ADMIN_REFUNDS.filter(
    (refund) => refund.orderId === orderId,
  );
  const latest = refunds[0];
  if (!latest) {
    return "No Refund";
  }
  if (latest.status === "completed") {
    return "Refunded";
  }
  if (latest.status === "requested" || latest.status === "approved") {
    return "Refund Pending";
  }
  if (latest.status === "rejected") {
    return "Refund Rejected";
  }
  return "No Refund";
}
