"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { hasPermission, PERMISSION_DENIED } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { getStaffSession } from "@/lib/auth/staff-session";
import {
  saveEmiConfig,
  type EmiMutationResult,
} from "@/lib/payments/emi-config";
import {
  saveOfflinePaymentConfig,
  type OfflinePaymentMutationResult,
} from "@/lib/payments/offline-config";

function revalidatePayments() {
  revalidatePath("/admin/payments/offline");
  revalidatePath("/admin/payments/emi");
  revalidatePath("/checkout");
}

async function staffForPayments(
  manageKey: string,
): Promise<
  | { ok: true; session: NonNullable<Awaited<ReturnType<typeof getStaffSession>>> }
  | { ok: false; formError: string }
> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, formError: "Sign in to continue." };
  }
  if (
    !hasPermission(session, manageKey) &&
    !hasPermission(session, "payment_methods.manage")
  ) {
    return { ok: false, formError: PERMISSION_DENIED };
  }
  return { ok: true, session };
}

export async function saveOfflinePaymentAction(input: {
  codEnabled: boolean;
  label: string;
  instructions: string;
}): Promise<OfflinePaymentMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffForPayments("payment_methods.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveOfflinePaymentConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePayments();
  }
  return result;
}

export async function saveEmiSettingsAction(input: {
  enabled: boolean;
  tenureMonths: number[];
  partnerName: string;
  interestNote: string;
  minOrderAmount: string;
}): Promise<EmiMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffForPayments("emi.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveEmiConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePayments();
  }
  return result;
}
