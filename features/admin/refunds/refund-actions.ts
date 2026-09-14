"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  completeRefund,
  decideRefund,
  type RefundMutationResult,
} from "@/lib/refunds/workflow";

async function guardProcess(): Promise<
  | {
      ok: true;
      actor: {
        staffId: string;
        fullName: string;
        email: string;
        ip: string | null;
      };
    }
  | { ok: false; reason: string }
> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, reason: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("refunds.process");
  if (!allowed.ok) {
    return { ok: false, reason: allowed.formError };
  }
  const meta = await getRequestMeta();
  return {
    ok: true,
    actor: {
      staffId: allowed.session.staffId,
      fullName: allowed.session.fullName,
      email: allowed.session.email,
      ip: meta.ip,
    },
  };
}

export async function approveRefundAction(
  refundId: string,
): Promise<RefundMutationResult> {
  const guard = await guardProcess();
  if (!guard.ok) {
    return guard;
  }
  return decideRefund({
    refundId,
    next: "APPROVED",
    actor: guard.actor,
  });
}

export async function rejectRefundAction(
  refundId: string,
): Promise<RefundMutationResult> {
  const guard = await guardProcess();
  if (!guard.ok) {
    return guard;
  }
  return decideRefund({
    refundId,
    next: "REJECTED",
    actor: guard.actor,
  });
}

export async function completeRefundAction(
  refundId: string,
): Promise<RefundMutationResult> {
  const guard = await guardProcess();
  if (!guard.ok) {
    return guard;
  }
  return completeRefund({
    refundId,
    actor: guard.actor,
  });
}
