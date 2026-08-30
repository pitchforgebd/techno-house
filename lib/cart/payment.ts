/**
 * Display-only mock payment methods.
 * No live gateways. Never collect raw card data, wallet PINs, or secrets in this UI.
 */

export type PaymentMethodId = "sslcommerz" | "bkash" | "cod";

export type PaymentMethod = {
  id: PaymentMethodId;
  name: string;
  description: string;
  /** How the mock flow would work later — for UI copy only. */
  flowNote: string;
};

export const MOCK_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: "sslcommerz",
    name: "SSLCommerz",
    description:
      "Pay online by card or other SSLCommerz options on a hosted page later.",
    flowNote:
      "Hosted redirect only when live payments ship. No card fields on this site.",
  },
  {
    id: "bkash",
    name: "bKash",
    description: "Pay with bKash via a provider-hosted checkout later.",
    flowNote:
      "Selection only — no bKash PIN, OTP, or wallet number is collected here.",
  },
  {
    id: "cod",
    name: "Cash on delivery",
    description: "Pay in cash when the order arrives.",
    flowNote: "No online charge in this mock.",
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
