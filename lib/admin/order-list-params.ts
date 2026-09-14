import type {
  OrderFulfillmentStatus,
  OrderPaymentStatus,
} from "@/lib/admin/orders-mock";

export const ADMIN_ORDER_PAGE_SIZE = 8;

export type AdminOrderListParams = {
  q: string;
  payment: "all" | OrderPaymentStatus;
  fulfillment: "all" | OrderFulfillmentStatus;
  date: string;
  unpaidOnly: boolean;
  page: number;
};

export type AdminOrderSearchParams = Record<
  string,
  string | string[] | undefined
>;

function first(raw: string | string[] | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

function parsePage(raw: string): number {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(n, 500);
}

const PAYMENTS = new Set<string>([
  "all",
  "paid",
  "unpaid",
  "failed",
  "refunded",
]);

const FULFILLMENTS = new Set<string>([
  "all",
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
]);

export function parseAdminOrderListParams(
  searchParams: AdminOrderSearchParams,
  options?: { unpaidOnly?: boolean },
): AdminOrderListParams {
  const paymentRaw = first(searchParams.payment).trim() || "all";
  const fulfillmentRaw = first(searchParams.fulfillment).trim() || "all";
  const unpaidOnly =
    options?.unpaidOnly === true || first(searchParams.unpaid) === "1";

  return {
    q: first(searchParams.q).trim().slice(0, 120),
    payment: (PAYMENTS.has(paymentRaw)
      ? paymentRaw
      : "all") as AdminOrderListParams["payment"],
    fulfillment: (FULFILLMENTS.has(fulfillmentRaw)
      ? fulfillmentRaw
      : "all") as AdminOrderListParams["fulfillment"],
    date: first(searchParams.date).trim().slice(0, 32),
    unpaidOnly,
    page: parsePage(first(searchParams.page)),
  };
}

export function adminOrdersHref(
  params: Partial<AdminOrderListParams> & {
    base?: AdminOrderListParams;
    path?: "/admin/orders" | "/admin/orders/unpaid";
  },
): string {
  const path = params.path ?? "/admin/orders";
  const base: AdminOrderListParams = params.base ?? {
    q: "",
    payment: "all",
    fulfillment: "all",
    date: "",
    unpaidOnly: path.endsWith("/unpaid"),
    page: 1,
  };
  const next: AdminOrderListParams = {
    q: params.q ?? base.q,
    payment: params.payment ?? base.payment,
    fulfillment: params.fulfillment ?? base.fulfillment,
    date: params.date ?? base.date,
    unpaidOnly: params.unpaidOnly ?? base.unpaidOnly,
    page: params.page ?? base.page,
  };

  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (!next.unpaidOnly && next.payment !== "all") {
    query.set("payment", next.payment);
  }
  if (next.fulfillment !== "all") {
    query.set("fulfillment", next.fulfillment);
  }
  if (next.date) {
    query.set("date", next.date);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
