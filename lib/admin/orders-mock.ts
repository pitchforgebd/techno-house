import type { Money } from "@/lib/data/types/common";
import { CURRENCY_CODE } from "@/lib/format/currency";

function money(amount: number): Money {
  return { amount, currency: CURRENCY_CODE };
}

export type OrderPaymentStatus = "paid" | "unpaid" | "failed" | "refunded";
export type OrderFulfillmentStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type AdminOrderLine = {
  id: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  colorName: string | null;
  colorHex: string | null;
  /** Set when this line was added via "Add build to cart" (AD-276) — lines sharing the same id came from one PC build. */
  buildBatchId: string | null;
};

export type AdminOrder = {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  placedAt: string;
  placedAtSort: string;
  total: Money;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: string;
  fulfillmentStatus: OrderFulfillmentStatus;
  shippingMethod: string;
  shippingAddress: string;
  notes: string | null;
  /** Internal staff notes (delivery assignment, ops notes). */
  staffNotes?: string | null;
  trackingCode: string | null;
  /** "pathao" | "steadfast" | manual courier name, or null if not sent. */
  carrierId?: string | null;
  /** Highlight recent unread orders in the list. */
  isNew: boolean;
  /** Precomputed refund column for the list UI. */
  refundLabel?: string;
  lines: AdminOrderLine[];
};

export const MOCK_DELIVERY_BOYS = [
  "Karim Ali",
  "Rafiq Hossain",
  "Nayeem Khan",
  "Sajid Rahman",
] as const;

export type RefundStatus = "requested" | "approved" | "rejected" | "completed";

export type RefundPaymentChannel = "wallet" | "offline" | "bkash" | "sslcommerz";

export type RefundTimelineActor = "customer" | "admin" | "system";

export type RefundTimelineEvent = {
  id: string;
  actor: RefundTimelineActor;
  actorName: string;
  at: string;
  message: string;
  statusBadge?: "rejected" | "approved" | "pending";
};

export type AdminRefund = {
  id: string;
  code: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  productName: string;
  amount: Money;
  status: RefundStatus;
  reason: string;
  requestedAt: string;
  resolvedAt: string | null;
  paymentChannel: RefundPaymentChannel;
  payoutStatus: "paid" | "non_paid";
  isDispute: boolean;
  timeline: RefundTimelineEvent[];
};

/** Display-only mock sales data for Phase 09 admin UI. */
export const MOCK_ADMIN_ORDERS: readonly AdminOrder[] = [
  {
    id: "ord-1048",
    number: "TH-1048",
    customerName: "N. Hasan",
    customerEmail: "n.hasan@example.com",
    customerPhone: "0171••••123",
    placedAt: "2026-08-31 · 14:22",
    placedAtSort: "2026-08-31T14:22:00",
    total: money(42900),
    paymentStatus: "paid",
    paymentMethod: "bKash",
    fulfillmentStatus: "processing",
    shippingMethod: "Home delivery — Dhaka",
    shippingAddress: "Mirpur, Dhaka",
    notes: null,
    trackingCode: "TRK-TH1048A1",
    isNew: true,
    lines: [
      {
        id: "l1",
        productName: "CoreLine 6-Core Processor",
        sku: "TH-CPU-CL6",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(18900),
      },
      {
        id: "l2",
        productName: "Volt B650 Micro-ATX Board",
        sku: "TH-MB-VB650",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(16800),
      },
      {
        id: "l3",
        productName: "Frost Air Cooler",
        sku: "TH-CL-FA1",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(7200),
      },
    ],
  },
  {
    id: "ord-1047",
    number: "TH-1047",
    customerName: "S. Akter",
    customerEmail: "s.akter@example.com",
    customerPhone: "0182••••445",
    placedAt: "2026-08-31 · 13:05",
    placedAtSort: "2026-08-31T13:05:00",
    total: money(18900),
    paymentStatus: "unpaid",
    paymentMethod: "SSLCommerz",
    fulfillmentStatus: "pending",
    shippingMethod: "Courier — outside Dhaka",
    shippingAddress: "Chattogram",
    notes: "Awaiting payment confirmation (>24h).",
    trackingCode: null,
    isNew: true,
    lines: [
      {
        id: "l1",
        productName: "CoreLine 6-Core Processor",
        sku: "TH-CPU-CL6",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(18900),
      },
    ],
  },
  {
    id: "ord-1046",
    number: "TH-1046",
    customerName: "R. Chowdhury",
    customerEmail: "r.chowdhury@example.com",
    customerPhone: "0191••••902",
    placedAt: "2026-08-31 · 11:48",
    placedAtSort: "2026-08-31T11:48:00",
    total: money(97500),
    paymentStatus: "paid",
    paymentMethod: "SSLCommerz",
    fulfillmentStatus: "shipped",
    shippingMethod: "Home delivery — Dhaka",
    shippingAddress: "Gulshan, Dhaka",
    notes: null,
    trackingCode: "TRK-TH1046B2",
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "Lumen 14 Laptop",
        sku: "TH-NB-L14",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(97500),
      },
    ],
  },
  {
    id: "ord-1045",
    number: "TH-1045",
    customerName: "M. Islam",
    customerEmail: "m.islam@example.com",
    customerPhone: "0161••••778",
    placedAt: "2026-08-31 · 09:16",
    placedAtSort: "2026-08-31T09:16:00",
    total: money(12400),
    paymentStatus: "failed",
    paymentMethod: "bKash",
    fulfillmentStatus: "pending",
    shippingMethod: "Store pickup",
    shippingAddress: "Techno House showroom",
    notes: "Gateway callback mismatch (mock).",
    trackingCode: null,
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "Volt Pad15 Wireless Charger",
        sku: "TH-ACC-VP15",
        quantity: 2,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(6200),
      },
    ],
  },
  {
    id: "ord-1044",
    number: "TH-1044",
    customerName: "F. Begum",
    customerEmail: "f.begum@example.com",
    customerPhone: "0151••••331",
    placedAt: "2026-08-30 · 21:40",
    placedAtSort: "2026-08-30T21:40:00",
    total: money(65800),
    paymentStatus: "paid",
    paymentMethod: "Cash on delivery",
    fulfillmentStatus: "processing",
    shippingMethod: "Home delivery — Dhaka",
    shippingAddress: "Uttara, Dhaka",
    notes: null,
    trackingCode: "TRK-TH1044C3",
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "Ridge 16 Gaming Laptop",
        sku: "TH-NB-R16",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(65800),
      },
    ],
  },
  {
    id: "ord-1043",
    number: "TH-1043",
    customerName: "A. Rahman",
    customerEmail: "a.rahman@example.com",
    customerPhone: "0131••••556",
    placedAt: "2026-08-30 · 18:12",
    placedAtSort: "2026-08-30T18:12:00",
    total: money(31200),
    paymentStatus: "refunded",
    paymentMethod: "SSLCommerz",
    fulfillmentStatus: "cancelled",
    shippingMethod: "Home delivery — Dhaka",
    shippingAddress: "Dhanmondi, Dhaka",
    notes: "Customer cancelled after partial refund request.",
    trackingCode: null,
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "CoreLine 8-Core Processor",
        sku: "TH-CPU-CL8",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(31200),
      },
    ],
  },
  {
    id: "ord-1042",
    number: "TH-1042",
    customerName: "T. Karim",
    customerEmail: "t.karim@example.com",
    customerPhone: "0175••••210",
    placedAt: "2026-08-30 · 12:05",
    placedAtSort: "2026-08-30T12:05:00",
    total: money(8900),
    paymentStatus: "unpaid",
    paymentMethod: "bKash",
    fulfillmentStatus: "pending",
    shippingMethod: "Courier — outside Dhaka",
    shippingAddress: "Sylhet",
    notes: null,
    trackingCode: null,
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "Frame 2TB HDD",
        sku: "TH-HD-F2T",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(8900),
      },
    ],
  },
  {
    id: "ord-1041",
    number: "TH-1041",
    customerName: "L. Sultana",
    customerEmail: "l.sultana@example.com",
    customerPhone: "0188••••667",
    placedAt: "2026-08-29 · 16:33",
    placedAtSort: "2026-08-29T16:33:00",
    total: money(24500),
    paymentStatus: "unpaid",
    paymentMethod: "SSLCommerz",
    fulfillmentStatus: "pending",
    shippingMethod: "Home delivery — Dhaka",
    shippingAddress: "Banani, Dhaka",
    notes: "Reminder SMS scheduled (mock).",
    trackingCode: null,
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "Volt 32GB DDR5 Kit",
        sku: "TH-RAM-V32",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(24500),
      },
    ],
  },
  {
    id: "ord-1040",
    number: "TH-1040",
    customerName: "K. Ahmed",
    customerEmail: "k.ahmed@example.com",
    customerPhone: "0199••••088",
    placedAt: "2026-08-29 · 10:20",
    placedAtSort: "2026-08-29T10:20:00",
    total: money(15200),
    paymentStatus: "paid",
    paymentMethod: "bKash",
    fulfillmentStatus: "delivered",
    shippingMethod: "Store pickup",
    shippingAddress: "Techno House showroom",
    notes: null,
    trackingCode: "TRK-TH1040D4",
    isNew: false,
    lines: [
      {
        id: "l1",
        productName: "Pulse 750W PSU",
        sku: "TH-PS-P750",
        quantity: 1,
        colorName: null,
        colorHex: null,
        buildBatchId: null,
        unitPrice: money(15200),
      },
    ],
  },
];

export const MOCK_ADMIN_REFUNDS: readonly AdminRefund[] = [
  {
    id: "ref-2201",
    code: "TH-RF-2201",
    orderId: "ord-1043",
    orderNumber: "TH-1043",
    customerName: "A. Rahman",
    productName: "CoreLine 8-Core Processor",
    amount: money(31200),
    status: "completed",
    reason: "Order cancelled — full refund",
    requestedAt: "2026-08-30 · 19:00",
    resolvedAt: "2026-08-31 · 09:15",
    paymentChannel: "sslcommerz",
    payoutStatus: "paid",
    isDispute: false,
    timeline: [
      {
        id: "te-2201-1",
        actor: "customer",
        actorName: "A. Rahman",
        at: "2026-08-30 · 19:00",
        message: "Refund requested",
        statusBadge: "pending",
      },
      {
        id: "te-2201-2",
        actor: "admin",
        actorName: "Ops",
        at: "2026-08-31 · 09:15",
        message: "Refund approved and paid out",
        statusBadge: "approved",
      },
    ],
  },
  {
    id: "ref-2202",
    code: "TH-RF-2202",
    orderId: "ord-1046",
    orderNumber: "TH-1046",
    customerName: "R. Chowdhury",
    productName: "Lumen 14 Laptop",
    amount: money(2500),
    status: "requested",
    reason: "Shipping delay compensation (partial)",
    requestedAt: "2026-08-31 · 15:40",
    resolvedAt: null,
    paymentChannel: "wallet",
    payoutStatus: "non_paid",
    isDispute: false,
    timeline: [
      {
        id: "te-2202-1",
        actor: "customer",
        actorName: "R. Chowdhury",
        at: "2026-08-31 · 15:40",
        message: "Refund requested",
        statusBadge: "pending",
      },
    ],
  },
  {
    id: "ref-2203",
    code: "TH-RF-2203",
    orderId: "ord-1040",
    orderNumber: "TH-1040",
    customerName: "K. Ahmed",
    productName: "Pulse 750W PSU",
    amount: money(15200),
    status: "rejected",
    reason: "Outside return window — DOA claim unsupported",
    requestedAt: "2026-08-30 · 11:00",
    resolvedAt: "2026-08-30 · 17:22",
    paymentChannel: "bkash",
    payoutStatus: "non_paid",
    isDispute: true,
    timeline: [
      {
        id: "te-2203-1",
        actor: "customer",
        actorName: "K. Ahmed",
        at: "2026-08-30 · 11:00",
        message: "Refund requested",
        statusBadge: "pending",
      },
      {
        id: "te-2203-2",
        actor: "admin",
        actorName: "Ops",
        at: "2026-08-30 · 17:22",
        message: "Refund rejected",
        statusBadge: "rejected",
      },
    ],
  },
  {
    id: "ref-2204",
    code: "TH-RF-2204",
    orderId: "ord-1044",
    orderNumber: "TH-1044",
    customerName: "F. Begum",
    productName: "Ridge 16 Gaming Laptop",
    amount: money(5000),
    status: "approved",
    reason: "Missing accessory — partial credit",
    requestedAt: "2026-08-31 · 08:10",
    resolvedAt: null,
    paymentChannel: "offline",
    payoutStatus: "non_paid",
    isDispute: false,
    timeline: [
      {
        id: "te-2204-1",
        actor: "customer",
        actorName: "F. Begum",
        at: "2026-08-31 · 08:10",
        message: "Refund requested",
        statusBadge: "pending",
      },
      {
        id: "te-2204-2",
        actor: "admin",
        actorName: "Ops",
        at: "2026-08-31 · 10:00",
        message: "Refund approved",
        statusBadge: "approved",
      },
    ],
  },
];
