/**
 * Refund request state machine (P13-T06).
 * Completing a refund is a staff action after approval — never the browser.
 */
import type { RefundStatus } from "@/lib/generated/prisma/enums";

const ALLOWED: Record<RefundStatus, readonly RefundStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["COMPLETED", "REJECTED"],
  REJECTED: [],
  COMPLETED: [],
};

export function canTransitionRefund(
  from: RefundStatus,
  to: RefundStatus,
): boolean {
  if (from === to) {
    return true;
  }
  return ALLOWED[from].includes(to);
}

export function refundTransitionError(
  from: RefundStatus,
  to: RefundStatus,
): string | null {
  if (canTransitionRefund(from, to)) {
    return null;
  }
  return `Refund cannot move from ${from} to ${to}.`;
}
