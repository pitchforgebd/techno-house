/**
 * Customer-facing order shapes (P13-T02).
 * Safe to pass into Client Components — no Prisma values.
 */

export type CustomerOrderStatus =
  "pending" | "processing" | "shipped" | "delivered" | "cancelled";

export type CustomerPaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "cancelled"
  | "refunded"
  | "partially_refunded";

export type CustomerOrderItemView = {
  productSlug: string | null;
  productName: string;
  sku: string;
  quantity: number;
  unitAmount: number;
  totalAmount: number;
  colorName: string | null;
  colorHex: string | null;
};

export type CustomerOrderView = {
  number: string;
  placedAt: string;
  status: CustomerOrderStatus;
  paymentStatus: CustomerPaymentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  notes: string | null;
  couponCode: string | null;
  shippingMethodLabel: string | null;
  paymentMethodId: string | null;
  paymentProvider: string | null;
  paymentFlow: "offline" | "hosted_deferred" | "hosted" | null;
  itemCount: number;
  subtotalAmount: number;
  discountAmount: number;
  shippingAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  totalAmount: number;
  items: CustomerOrderItemView[];
};

export function paymentPendingNote(
  flow: CustomerOrderView["paymentFlow"],
): string {
  if (flow === "offline") {
    return "Cash on delivery — not marked paid.";
  }
  if (flow === "hosted") {
    return "Waiting for the gateway to confirm. Returning here is not proof of payment.";
  }
  if (flow === "hosted_deferred") {
    return "Hosted checkout is not connected yet. Not charged.";
  }
  return "Not charged.";
}

export function orderStatusLabel(status: CustomerOrderStatus): string {
  switch (status) {
    case "pending":
      return "Placed";
    case "processing":
      return "Confirmed";
    case "shipped":
      return "Shipped";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
  }
}
