/**
 * Customer order reads (P13-T02).
 * Only the signed-in owner's orders are returned.
 */
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getPrisma } from "@/lib/db/prisma";
import type {
  CustomerOrderStatus,
  CustomerOrderView,
  CustomerPaymentStatus,
} from "@/lib/orders/order-view";
import { paymentFlowForProvider } from "@/lib/payments/adapters";
import type {
  OrderStatus as DbOrderStatus,
  PaymentStatus as DbPaymentStatus,
} from "@/lib/generated/prisma/enums";

function usesOrderDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

const orderInclude = {
  items: {
    include: { product: { select: { slug: true } } },
    orderBy: { id: "asc" as const },
  },
  payments: {
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { method: true, provider: true },
  },
};

type OrderRow = {
  number: string;
  placedAt: Date;
  status: DbOrderStatus;
  paymentStatus: DbPaymentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes: string | null;
  couponCode: string | null;
  shippingMethodLabel: string | null;
  subtotalAmount: number;
  discountAmount: number;
  adminDiscountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  items: {
    productName: string;
    sku: string;
    quantity: number;
    unitAmount: number;
    totalAmount: number;
    colorName: string | null;
    colorHex: string | null;
    product: { slug: string } | null;
  }[];
  payments: { method: string | null; provider: string }[];
};

function toStatus(status: DbOrderStatus): CustomerOrderStatus {
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

function toPaymentStatus(status: DbPaymentStatus): CustomerPaymentStatus {
  switch (status) {
    case "PROCESSING":
      return "processing";
    case "PAID":
      return "paid";
    case "FAILED":
      return "failed";
    case "CANCELLED":
      return "cancelled";
    case "REFUNDED":
      return "refunded";
    case "PARTIALLY_REFUNDED":
      return "partially_refunded";
    default:
      return "pending";
  }
}

export function toCustomerOrderView(row: OrderRow): CustomerOrderView {
  const itemCount = row.items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    number: row.number,
    placedAt: row.placedAt.toISOString(),
    status: toStatus(row.status),
    paymentStatus: toPaymentStatus(row.paymentStatus),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    shippingAddress: row.shippingAddress,
    notes: row.notes,
    couponCode: row.couponCode,
    shippingMethodLabel: row.shippingMethodLabel,
    paymentMethodId: row.payments[0]?.method ?? null,
    paymentProvider: row.payments[0]?.provider ?? null,
    paymentFlow: paymentFlowForProvider(
      row.payments[0]?.provider ?? null,
      row.paymentStatus,
    ),
    itemCount,
    subtotalAmount: row.subtotalAmount,
    discountAmount: row.discountAmount,
    adminDiscountAmount: row.adminDiscountAmount,
    shippingAmount: row.shippingAmount,
    taxAmount: row.taxAmount,
    serviceChargeAmount: row.serviceChargeAmount,
    totalAmount: row.totalAmount,
    items: row.items.map((item) => ({
      productSlug: item.product?.slug ?? null,
      productName: item.productName,
      sku: item.sku,
      quantity: item.quantity,
      unitAmount: item.unitAmount,
      totalAmount: item.totalAmount,
      colorName: item.colorName,
      colorHex: item.colorHex,
    })),
  };
}

export async function listCustomerOrders(): Promise<CustomerOrderView[]> {
  if (!usesOrderDatabase()) {
    return [];
  }
  const session = await getCustomerSession();
  if (!session) {
    return [];
  }
  const rows = await getPrisma().order.findMany({
    where: { userId: session.userId },
    orderBy: { placedAt: "desc" },
    take: 50,
    include: orderInclude,
  });
  return rows.map(toCustomerOrderView);
}

/** No session/ownership check — for server-side jobs (order-confirmation
 * notifications) that already know the id is the right one to act on. */
export async function getOrderViewById(
  id: string,
): Promise<CustomerOrderView | null> {
  if (!usesOrderDatabase()) {
    return null;
  }
  const row = await getPrisma().order.findUnique({
    where: { id },
    include: orderInclude,
  });
  return row ? toCustomerOrderView(row) : null;
}

export async function getCustomerOrderByNumber(
  rawNumber: string,
): Promise<CustomerOrderView | null> {
  if (!usesOrderDatabase()) {
    return null;
  }
  const session = await getCustomerSession();
  if (!session) {
    return null;
  }
  const number = rawNumber.trim().slice(0, 40);
  if (!number) {
    return null;
  }
  const row = await getPrisma().order.findFirst({
    where: { number, userId: session.userId },
    include: orderInclude,
  });
  return row ? toCustomerOrderView(row) : null;
}
