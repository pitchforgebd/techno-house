export type AdminRefundReasonType = "customer" | "admin_reject";

export type AdminRefundReason = {
  id: string;
  type: AdminRefundReasonType;
  reason: string;
  status: boolean;
};

export const MOCK_REFUND_REASONS: AdminRefundReason[] = [
  {
    id: "rr-1",
    type: "customer",
    reason: "Ordered the wrong product",
    status: true,
  },
  {
    id: "rr-2",
    type: "customer",
    reason: "Product arrived damaged",
    status: true,
  },
  {
    id: "rr-3",
    type: "customer",
    reason: "Missing accessories",
    status: true,
  },
  {
    id: "rr-4",
    type: "admin_reject",
    reason: "Outside return window",
    status: true,
  },
  {
    id: "rr-5",
    type: "admin_reject",
    reason: "Product used / seals broken",
    status: true,
  },
  {
    id: "rr-6",
    type: "admin_reject",
    reason: "Insufficient evidence",
    status: false,
  },
];

/** @deprecated Prefer getRefundPolicySettings() — kept for seed defaults. */
export type AdminRefundSettings = {
  refundType: "global" | "category";
  globalRefundDays: number;
  disputeEnabled: boolean;
  disputeDays: number;
};

export const MOCK_REFUND_SETTINGS: AdminRefundSettings = {
  refundType: "global",
  globalRefundDays: 7,
  disputeEnabled: false,
  disputeDays: 3,
};

/** @deprecated Category days live in RefundSettings.categoryDaysJson. */
export const MOCK_CATEGORY_REFUND_DAYS: Record<string, number> = {
  laptops: 7,
  components: 14,
  monitors: 7,
  gaming: 10,
};
