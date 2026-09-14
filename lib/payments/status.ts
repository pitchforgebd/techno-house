/**
 * Payment status machine (P13-T03).
 *
 * Only the server may apply transitions. The browser cannot mark a payment
 * paid. Refund states are reserved for P13-T06.
 */
import type { PaymentStatus } from "@/lib/generated/prisma/enums";

const ALLOWED: Record<PaymentStatus, readonly PaymentStatus[]> = {
  PENDING: ["PROCESSING", "FAILED", "CANCELLED", "PAID"],
  PROCESSING: ["PAID", "FAILED", "CANCELLED", "PENDING"],
  PAID: ["REFUNDED", "PARTIALLY_REFUNDED"],
  FAILED: ["PENDING", "CANCELLED"],
  CANCELLED: [],
  REFUNDED: [],
  PARTIALLY_REFUNDED: ["REFUNDED", "PARTIALLY_REFUNDED"],
};

export function canTransitionPayment(
  from: PaymentStatus,
  to: PaymentStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED[from].includes(to);
}

export function paymentTransitionError(
  from: PaymentStatus,
  to: PaymentStatus,
): string | null {
  if (canTransitionPayment(from, to)) {
    return null;
  }
  return `Payment cannot move from ${from} to ${to}.`;
}
