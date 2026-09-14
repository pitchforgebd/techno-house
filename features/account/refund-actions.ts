"use server";

import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  requestCustomerRefund,
  type RefundMutationResult,
} from "@/lib/refunds/workflow";

export async function requestRefundAction(input: {
  orderNumber: string;
  amount: number;
  reasonId: string | null;
  reasonText: string;
}): Promise<RefundMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, reason: CROSS_ORIGIN_ERROR };
  }
  return requestCustomerRefund(input);
}
