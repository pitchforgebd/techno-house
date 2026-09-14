/**
 * Admin customer reads (wired to PostgreSQL when DATA_SOURCE ≠ mock).
 *
 * Storefront auth creates real `User` rows; the list/detail UI must read the
 * same source. Mock rows remain only for `DATA_SOURCE=mock`.
 */
import {
  MOCK_ADMIN_CUSTOMERS,
  maskCustomerEmail,
  type AdminCustomer,
  type CustomerStatus,
} from "@/lib/admin/customers-mock";
import { getAdminOrderById } from "@/lib/admin/load-orders";
import { MOCK_ADMIN_ORDERS, type AdminOrder } from "@/lib/admin/orders-mock";
import type { Money } from "@/lib/data/types/common";
import { getPrisma } from "@/lib/db/prisma";
import type {
  PaymentStatus as DbPaymentStatus,
  UserStatus as DbUserStatus,
} from "@/lib/generated/prisma/enums";
import {
  ADMIN_CUSTOMER_PAGE_SIZE,
  adminCustomersHref,
  CUSTOMER_TAB_LABELS,
  parseAdminCustomerListParams,
  type AdminCustomerListParams,
  type AdminCustomerSearchParams,
  type AdminCustomerTab,
} from "@/lib/admin/customer-list-params";

export {
  ADMIN_CUSTOMER_PAGE_SIZE,
  adminCustomersHref,
  CUSTOMER_TAB_LABELS,
  parseAdminCustomerListParams,
  type AdminCustomerListParams,
  type AdminCustomerSearchParams,
  type AdminCustomerTab,
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
    return phone || "—";
  }
  return `${digits.slice(0, 4)}••••${digits.slice(-3)}`;
}

function formatJoinedAt(value: Date): { label: string; sort: string } {
  const sort = value.toISOString().slice(0, 10);
  return { label: sort, sort };
}

function formatOrderAt(value: Date): string {
  const label = value.toLocaleString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return label.replace(",", " ·");
}

function toCustomerStatus(status: DbUserStatus): CustomerStatus {
  switch (status) {
    case "BLOCKED":
      return "blocked";
    case "INVITED":
      return "invited";
    default:
      return "active";
  }
}

function matchesTab(customer: AdminCustomer, tab: AdminCustomerTab): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "banned") {
    return customer.status === "blocked";
  }
  if (tab === "suspicious") {
    return customer.suspicious;
  }
  if (tab === "verified") {
    return customer.verified;
  }
  if (tab === "unverified") {
    return !customer.verified;
  }
  return true;
}

export type AdminCustomerListResult = {
  items: AdminCustomer[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: AdminCustomerListParams;
};

type UserOrderRow = {
  id: string;
  number: string;
  totalAmount: number;
  paymentStatus: DbPaymentStatus;
  placedAt: Date;
};

type UserRow = {
  id: string;
  email: string;
  phone: string | null;
  fullName: string;
  status: DbUserStatus;
  emailVerifiedAt: Date | null;
  isSuspicious: boolean;
  walletAmount: number;
  city: string | null;
  notes: string | null;
  createdAt: Date;
  orders: UserOrderRow[];
};

function toAdminCustomer(
  row: UserRow,
  options?: { maskPii?: boolean },
): AdminCustomer {
  const maskPii = options?.maskPii !== false;
  const phoneFull = row.phone?.trim() || "";
  const joined = formatJoinedAt(row.createdAt);
  const orders = [...row.orders].sort(
    (a, b) => b.placedAt.getTime() - a.placedAt.getTime(),
  );
  const paidSpend = orders
    .filter((order) => order.paymentStatus === "PAID")
    .reduce((sum, order) => sum + order.totalAmount, 0);
  const last = orders[0];

  return {
    id: row.id,
    fullName: row.fullName,
    email: maskPii ? maskCustomerEmail(row.email) : row.email,
    phoneMasked: maskPhone(phoneFull),
    phoneFull: maskPii && phoneFull ? maskPhone(phoneFull) : phoneFull || "—",
    status: toCustomerStatus(row.status),
    verified: row.emailVerifiedAt != null,
    suspicious: row.isSuspicious,
    walletBalance: money(row.walletAmount),
    packageLabel: null,
    joinedAt: joined.label,
    joinedAtSort: joined.sort,
    orderCount: orders.length,
    totalSpend: money(paidSpend),
    lastOrderAt: last ? formatOrderAt(last.placedAt) : null,
    lastOrderId: last?.id ?? null,
    // The link target. `lastOrderId` is the cuid and stays for internal use;
    // admin URLs quote the number the customer sees, so staff and customer are
    // always looking at the same reference.
    lastOrderNumber: last?.number ?? null,
    city: row.city?.trim() || "",
    notes: row.notes,
    orderIds: orders.map((order) => order.id),
  };
}

const userSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  status: true,
  emailVerifiedAt: true,
  isSuspicious: true,
  walletAmount: true,
  city: true,
  notes: true,
  createdAt: true,
  orders: {
    orderBy: { placedAt: "desc" as const },
    select: {
      id: true,
      number: true,
      totalAmount: true,
      paymentStatus: true,
      placedAt: true,
    },
  },
} as const;

function filterMockList(params: AdminCustomerListParams): AdminCustomer[] {
  let items = [...MOCK_ADMIN_CUSTOMERS].filter((customer) =>
    matchesTab(customer, params.tab),
  );

  if (params.q) {
    const q = params.q.toLowerCase();
    items = items.filter(
      (customer) =>
        customer.fullName.toLowerCase().includes(q) ||
        customer.email.toLowerCase().includes(q) ||
        customer.phoneFull.includes(q) ||
        customer.city.toLowerCase().includes(q) ||
        customer.id.toLowerCase().includes(q),
    );
  }

  items.sort((a, b) => b.joinedAtSort.localeCompare(a.joinedAtSort));
  return items;
}

function tabWhere(tab: AdminCustomerTab): {
  status?: DbUserStatus;
  isSuspicious?: boolean;
  emailVerifiedAt?: { not: null } | null;
} {
  switch (tab) {
    case "banned":
      return { status: "BLOCKED" };
    case "suspicious":
      return { isSuspicious: true };
    case "verified":
      return { emailVerifiedAt: { not: null } };
    case "unverified":
      return { emailVerifiedAt: null };
    default:
      return {};
  }
}

export async function loadAdminCustomerList(
  params: AdminCustomerListParams,
): Promise<AdminCustomerListResult> {
  const pageSize = ADMIN_CUSTOMER_PAGE_SIZE;

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
    status?: DbUserStatus;
    isSuspicious?: boolean;
    emailVerifiedAt?: { not: null } | null;
    OR?: {
      id?: { contains: string; mode: "insensitive" };
      fullName?: { contains: string; mode: "insensitive" };
      email?: { contains: string; mode: "insensitive" };
      phone?: { contains: string; mode: "insensitive" };
      city?: { contains: string; mode: "insensitive" };
    }[];
  } = { ...tabWhere(params.tab) };

  if (params.q) {
    where.OR = [
      { id: { contains: params.q, mode: "insensitive" } },
      { fullName: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { phone: { contains: params.q, mode: "insensitive" } },
      { city: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const prisma = getPrisma();
  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const rows = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: userSelect,
  });

  return {
    items: rows.map((row) => toAdminCustomer(row, { maskPii: true })),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

export async function getAdminCustomerById(
  id: string,
): Promise<AdminCustomer | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }

  if (!usesDatabase()) {
    return (
      MOCK_ADMIN_CUSTOMERS.find((customer) => customer.id === trimmed) ?? null
    );
  }

  const row = await getPrisma().user.findUnique({
    where: { id: trimmed },
    select: userSelect,
  });
  if (!row) {
    return null;
  }
  return toAdminCustomer(row, { maskPii: false });
}

export async function getAdminCustomerOrders(
  customer: AdminCustomer,
): Promise<AdminOrder[]> {
  if (!usesDatabase()) {
    return customer.orderIds
      .map(
        (orderId) =>
          MOCK_ADMIN_ORDERS.find((order) => order.id === orderId) ?? null,
      )
      .filter((order): order is AdminOrder => order !== null)
      .sort((a, b) => b.placedAtSort.localeCompare(a.placedAtSort));
  }

  const orders = (
    await Promise.all(customer.orderIds.map((orderId) => getAdminOrderById(orderId)))
  ).filter((order): order is AdminOrder => order !== null);

  return orders.sort((a, b) => b.placedAtSort.localeCompare(a.placedAtSort));
}
