export const CHECKOUT_CONTACT_KEY = "techno-house-checkout-contact-v1";
export const LAST_ORDER_KEY = "techno-house-last-order-v1";

export type CheckoutContact = {
  fullName: string;
  phone: string;
  email: string;
  addressLine: string;
  notes: string;
};

export const EMPTY_CHECKOUT_CONTACT: CheckoutContact = {
  fullName: "",
  phone: "",
  email: "",
  addressLine: "",
  notes: "",
};

export type CheckoutStepId = "contact" | "delivery" | "payment" | "review";

export const CHECKOUT_STEPS: { id: CheckoutStepId; label: string }[] = [
  { id: "contact", label: "Contact" },
  { id: "delivery", label: "Delivery" },
  { id: "payment", label: "Payment" },
  { id: "review", label: "Review" },
];

export type MockOrderSnapshot = {
  orderId: string;
  createdAt: string;
  fullName: string;
  phone: string;
  email: string;
  addressLine: string;
  notes: string;
  shippingMethodId: string | null;
  shippingAreaId: string | null;
  paymentMethodId: string | null;
  couponCode: string | null;
  itemCount: number;
  /** Display-only totals captured at place-order time. */
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  total: number;
  lineSummaries: {
    slug: string;
    name: string;
    quantity: number;
    lineTotal: number;
  }[];
};

export function validateCheckoutContact(
  contact: CheckoutContact,
): Partial<Record<keyof CheckoutContact, string>> {
  const errors: Partial<Record<keyof CheckoutContact, string>> = {};
  if (!contact.fullName.trim()) {
    errors.fullName = "Enter your full name.";
  }
  if (!contact.phone.trim()) {
    errors.phone = "Enter a mobile number.";
  } else if (!/^[\d+\-\s]{8,20}$/.test(contact.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  if (!contact.email.trim()) {
    errors.email = "Enter an email address.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!contact.addressLine.trim()) {
    errors.addressLine = "Enter a delivery address or pickup note.";
  }
  return errors;
}

export function createMockOrderId(): string {
  return `TH-${Date.now().toString(36).toUpperCase()}`;
}

export function parseMockOrderSnapshot(raw: unknown): MockOrderSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<MockOrderSnapshot>;
  if (typeof data.orderId !== "string" || typeof data.createdAt !== "string") {
    return null;
  }
  if (
    typeof data.subtotal !== "number" ||
    typeof data.total !== "number" ||
    !Array.isArray(data.lineSummaries)
  ) {
    return null;
  }
  const lineSummaries = data.lineSummaries
    .filter(
      (line): line is MockOrderSnapshot["lineSummaries"][number] =>
        !!line &&
        typeof line === "object" &&
        typeof line.slug === "string" &&
        typeof line.name === "string" &&
        typeof line.quantity === "number" &&
        typeof line.lineTotal === "number",
    )
    .slice(0, 24);
  if (lineSummaries.length === 0) {
    return null;
  }
  return {
    orderId: data.orderId,
    createdAt: data.createdAt,
    fullName: typeof data.fullName === "string" ? data.fullName : "",
    phone: typeof data.phone === "string" ? data.phone : "",
    email: typeof data.email === "string" ? data.email : "",
    addressLine: typeof data.addressLine === "string" ? data.addressLine : "",
    notes: typeof data.notes === "string" ? data.notes : "",
    shippingMethodId:
      typeof data.shippingMethodId === "string" ? data.shippingMethodId : null,
    shippingAreaId:
      typeof data.shippingAreaId === "string" ? data.shippingAreaId : null,
    paymentMethodId:
      typeof data.paymentMethodId === "string" ? data.paymentMethodId : null,
    couponCode: typeof data.couponCode === "string" ? data.couponCode : null,
    itemCount: typeof data.itemCount === "number" ? data.itemCount : 0,
    subtotal: data.subtotal,
    discountAmount:
      typeof data.discountAmount === "number" ? data.discountAmount : 0,
    shippingAmount:
      typeof data.shippingAmount === "number" ? data.shippingAmount : 0,
    total: data.total,
    lineSummaries,
  };
}

export function readLastOrderSnapshot(): MockOrderSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(LAST_ORDER_KEY);
    if (!raw) {
      return null;
    }
    return parseMockOrderSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}
