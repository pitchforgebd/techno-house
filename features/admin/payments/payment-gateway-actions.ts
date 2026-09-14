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
  saveBkashGateway,
  saveNagadGateway,
  saveSslcommerzGateway,
  type GatewayMutationResult,
} from "@/lib/payments/gateway-settings";

function revalidatePayments() {
  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
}

async function staffForGateway(
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

export async function saveSslcommerzGatewayAction(input: {
  enabled: boolean;
  sandbox: boolean;
  storeId: string;
  storePassword: string;
}): Promise<GatewayMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffForGateway("sslcommerz.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveSslcommerzGateway({
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

export async function saveBkashGatewayAction(input: {
  enabled: boolean;
  sandbox: boolean;
  appKey: string;
  appSecret: string;
  username: string;
  password: string;
}): Promise<GatewayMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffForGateway("bkash.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveBkashGateway({
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

export async function saveNagadGatewayAction(input: {
  enabled: boolean;
  mode: string;
  merchantId: string;
  merchantNumber: string;
  publicKey: string;
  privateKey: string;
}): Promise<GatewayMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffForGateway("nagad.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveNagadGateway({
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
