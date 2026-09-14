/**
 * Storefront payment methods shown at checkout.
 * Online methods redirect to that provider's hosted page (sandbox or live
 * is controlled by server env flags, never shown in the UI).
 * Never collect raw card data, wallet PINs, or secrets in this UI.
 */

export type PaymentMethodId = "sslcommerz" | "bkash" | "nagad" | "cod";

export type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  description: string;
  /** How the flow works — for UI copy only. */
  flowNote: string;
};

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "cod",
    name: "Cash on delivery",
    description: "Pay in cash when the order arrives.",
    flowNote: "No online payment page.",
  },
  {
    id: "sslcommerz",
    name: "SSLCommerz",
    description:
      "Pay online by card, internet banking, or other SSLCommerz options.",
    flowNote: "You will complete payment on the SSLCommerz page.",
  },
  {
    id: "bkash",
    name: "bKash",
    description: "Pay with bKash on the secure bKash checkout page.",
    flowNote: "You will complete payment on the bKash page.",
  },
  {
    id: "nagad",
    name: "Nagad",
    description: "Pay with Nagad on the secure Nagad checkout page.",
    flowNote: "You will complete payment on the Nagad page.",
  },
];

/** Labels for retired mock ids (old cart/order snapshots). */
const LEGACY_PAYMENT_LABELS: Record<string, string> = {
  card_hosted: "Card (hosted checkout) — retired",
  mobile_banking: "Mobile banking — retired",
  pos_delivery: "POS on delivery — removed",
};

export function findPaymentMethod(
  methodId: string | null,
): PaymentMethod | null {
  if (!methodId) {
    return null;
  }
  return MOCK_PAYMENT_METHODS.find((method) => method.id === methodId) ?? null;
}

/** Display name for current or legacy mock payment ids. */
export function paymentMethodLabel(methodId: string | null): string {
  if (!methodId) {
    return "—";
  }
  const current = findPaymentMethod(methodId);
  if (current) {
    return current.name;
  }
  return LEGACY_PAYMENT_LABELS[methodId] ?? methodId;
}
