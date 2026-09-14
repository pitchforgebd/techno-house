import type { Money } from "@/lib/data/types/common";
import { CURRENCY_CODE } from "@/lib/format/currency";
import { MOCK_ADMIN_ORDERS } from "@/lib/admin/orders-mock";

function money(amount: number): Money {
  return { amount, currency: CURRENCY_CODE };
}

export type CustomerStatus = "active" | "blocked" | "invited";

export type AdminCustomer = {
  id: string;
  fullName: string;
  email: string;
  /** Masked for list display. */
  phoneMasked: string;
  phoneFull: string;
  status: CustomerStatus;
  verified: boolean;
  suspicious: boolean;
  walletBalance: Money;
  /** Optional membership/package label (often empty). */
  packageLabel: string | null;
  joinedAt: string;
  joinedAtSort: string;
  orderCount: number;
  totalSpend: Money;
  lastOrderAt: string | null;
  lastOrderId: string | null;
  /** Customer-facing Order ID of the most recent order. */
  lastOrderNumber: string | null;
  city: string;
  notes: string | null;
  /** Order ids from mock sales data. */
  orderIds: string[];
};

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) {
    return "•••@•••";
  }
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}•••@${domain}`;
}

/**
 * Seed customers aligned with mock orders plus a few extras.
 * Display-only for Phase 09.
 */
const SEED: Omit<
  AdminCustomer,
  "orderCount"
  | "totalSpend"
  | "lastOrderAt"
  | "lastOrderId"
  | "lastOrderNumber"
  | "orderIds"
>[] = [
  {
    id: "cus-n-hasan",
    fullName: "N. Hasan",
    email: "n.hasan@example.com",
    phoneMasked: "0171••••123",
    phoneFull: "01710000123",
    status: "active",
    verified: true,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2026-03-12",
    joinedAtSort: "2026-03-12",
    city: "Dhaka",
    notes: null,
  },
  {
    id: "cus-s-akter",
    fullName: "S. Akter",
    email: "s.akter@example.com",
    phoneMasked: "0182••••445",
    phoneFull: "01820000445",
    status: "active",
    verified: true,
    suspicious: false,
    walletBalance: money(50000),
    packageLabel: null,
    joinedAt: "2026-05-02",
    joinedAtSort: "2026-05-02",
    city: "Chattogram",
    notes: "Prefers evening delivery windows.",
  },
  {
    id: "cus-r-chowdhury",
    fullName: "R. Chowdhury",
    email: "r.chowdhury@example.com",
    phoneMasked: "0191••••902",
    phoneFull: "01910000902",
    status: "active",
    verified: true,
    suspicious: true,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2025-11-20",
    joinedAtSort: "2025-11-20",
    city: "Dhaka",
    notes: "Flagged after multiple address changes (mock).",
  },
  {
    id: "cus-m-islam",
    fullName: "M. Islam",
    email: "m.islam@example.com",
    phoneMasked: "0161••••778",
    phoneFull: "01610000778",
    status: "active",
    verified: false,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2026-07-18",
    joinedAtSort: "2026-07-18",
    city: "Dhaka",
    notes: "Failed payment on TH-1045 — follow up.",
  },
  {
    id: "cus-f-begum",
    fullName: "F. Begum",
    email: "f.begum@example.com",
    phoneMasked: "0151••••331",
    phoneFull: "01510000331",
    status: "active",
    verified: true,
    suspicious: false,
    walletBalance: money(120000),
    packageLabel: null,
    joinedAt: "2026-01-08",
    joinedAtSort: "2026-01-08",
    city: "Dhaka",
    notes: null,
  },
  {
    id: "cus-a-rahman",
    fullName: "A. Rahman",
    email: "a.rahman@example.com",
    phoneMasked: "0131••••556",
    phoneFull: "01310000556",
    status: "active",
    verified: true,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2026-02-14",
    joinedAtSort: "2026-02-14",
    city: "Dhaka",
    notes: "Refund completed on TH-1043.",
  },
  {
    id: "cus-t-karim",
    fullName: "T. Karim",
    email: "t.karim@example.com",
    phoneMasked: "0175••••210",
    phoneFull: "01750000210",
    status: "active",
    verified: false,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2026-08-01",
    joinedAtSort: "2026-08-01",
    city: "Sylhet",
    notes: null,
  },
  {
    id: "cus-l-sultana",
    fullName: "L. Sultana",
    email: "l.sultana@example.com",
    phoneMasked: "0188••••667",
    phoneFull: "01880000667",
    status: "active",
    verified: true,
    suspicious: false,
    walletBalance: money(25000),
    packageLabel: null,
    joinedAt: "2026-06-22",
    joinedAtSort: "2026-06-22",
    city: "Dhaka",
    notes: null,
  },
  {
    id: "cus-k-ahmed",
    fullName: "K. Ahmed",
    email: "k.ahmed@example.com",
    phoneMasked: "0199••••088",
    phoneFull: "01990000088",
    status: "active",
    verified: true,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2025-09-30",
    joinedAtSort: "2025-09-30",
    city: "Dhaka",
    notes: null,
  },
  {
    id: "cus-j-noor",
    fullName: "J. Noor",
    email: "j.noor@example.com",
    phoneMasked: "0172••••990",
    phoneFull: "01720000990",
    status: "invited",
    verified: false,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2026-08-28",
    joinedAtSort: "2026-08-28",
    city: "Rajshahi",
    notes: "Registered but no orders yet.",
  },
  {
    id: "cus-p-hossain",
    fullName: "P. Hossain",
    email: "p.hossain@example.com",
    phoneMasked: "0168••••441",
    phoneFull: "01680000441",
    status: "blocked",
    verified: false,
    suspicious: false,
    walletBalance: money(0),
    packageLabel: null,
    joinedAt: "2025-12-03",
    joinedAtSort: "2025-12-03",
    city: "Khulna",
    notes: "Blocked for repeated failed COD abuse (mock).",
  },
];

export const MOCK_ADMIN_CUSTOMERS: readonly AdminCustomer[] = SEED.map(
  (seed) => {
    const orders = MOCK_ADMIN_ORDERS.filter(
      (order) => order.customerName === seed.fullName,
    );
    const orderIds = orders.map((order) => order.id);
    const totalSpendAmount = orders
      .filter((order) => order.paymentStatus === "paid")
      .reduce((sum, order) => sum + order.total.amount, 0);
    const last = [...orders].sort((a, b) =>
      b.placedAtSort.localeCompare(a.placedAtSort),
    )[0];

    return {
      ...seed,
      orderCount: orders.length,
      totalSpend: money(totalSpendAmount),
      lastOrderAt: last?.placedAt ?? null,
      lastOrderId: last?.id ?? null,
      lastOrderNumber: last?.number ?? null,
      orderIds,
    };
  },
);

export function maskCustomerEmail(email: string): string {
  return maskEmail(email);
}
