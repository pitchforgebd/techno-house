import type {
  AdminRefund,
  RefundPaymentChannel,
  RefundStatus,
} from "@/lib/admin/orders-mock";

export type AdminRefundTab =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "wallet"
  | "offline";

export type AdminRefundListParams = {
  q: string;
  tab: AdminRefundTab;
  page: number;
  disputesOnly: boolean;
};

export type AdminRefundSearchParams = Record<
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

function isTab(value: string): value is AdminRefundTab {
  return (
    value === "all" ||
    value === "pending" ||
    value === "approved" ||
    value === "rejected" ||
    value === "wallet" ||
    value === "offline"
  );
}

export function parseAdminRefundListParams(
  searchParams: AdminRefundSearchParams,
  options?: { disputesOnly?: boolean },
): AdminRefundListParams {
  const tabRaw = first(searchParams.tab).trim() || "all";
  return {
    q: first(searchParams.q).trim().slice(0, 120),
    tab: isTab(tabRaw) ? tabRaw : "all",
    page: parsePage(first(searchParams.page)),
    disputesOnly: options?.disputesOnly === true,
  };
}

export function adminRefundsHref(
  params: Partial<AdminRefundListParams> & {
    base?: AdminRefundListParams;
    path?: "/admin/refunds" | "/admin/refunds/disputes";
  },
): string {
  const path = params.path ?? "/admin/refunds";
  const base: AdminRefundListParams = params.base ?? {
    q: "",
    tab: "all",
    page: 1,
    disputesOnly: path.includes("/disputes"),
  };
  const next: AdminRefundListParams = {
    q: params.q ?? base.q,
    tab: params.tab ?? base.tab,
    page: params.page ?? base.page,
    disputesOnly: params.disputesOnly ?? base.disputesOnly,
  };

  const query = new URLSearchParams();
  if (next.q) {
    query.set("q", next.q);
  }
  if (next.tab !== "all") {
    query.set("tab", next.tab);
  }
  if (next.page > 1) {
    query.set("page", String(next.page));
  }
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}

export const REFUND_TAB_LABELS: Record<AdminRefundTab, string> = {
  all: "All refunds",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  wallet: "Wallet",
  offline: "Offline",
};

export const DISPUTE_TAB_LABELS: Record<AdminRefundTab, string> = {
  all: "All dispute refunds",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  wallet: "Wallet",
  offline: "Offline",
};

export function matchesRefundTab(
  refund: AdminRefund,
  tab: AdminRefundTab,
): boolean {
  if (tab === "all") {
    return true;
  }
  if (tab === "pending") {
    return refund.status === "requested";
  }
  if (tab === "approved") {
    return refund.status === "approved" || refund.status === "completed";
  }
  if (tab === "rejected") {
    return refund.status === "rejected";
  }
  if (tab === "wallet") {
    return refund.paymentChannel === "wallet";
  }
  if (tab === "offline") {
    return refund.paymentChannel === "offline";
  }
  return true;
}

export function refundStatusLabel(status: RefundStatus): string {
  if (status === "requested") {
    return "Pending";
  }
  if (status === "completed") {
    return "Approved";
  }
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function refundChannelLabel(channel: RefundPaymentChannel): string {
  switch (channel) {
    case "wallet":
      return "Wallet";
    case "offline":
      return "Offline";
    case "bkash":
      return "bKash";
    case "sslcommerz":
      return "SSLCommerz";
  }
}
