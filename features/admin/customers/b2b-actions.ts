"use server";

import { revalidatePath } from "next/cache";
import {
  approveB2BAccount,
  setB2BAccountSuspended,
  updateB2BAccount,
  type SaveB2BResult,
} from "@/lib/admin/b2b-accounts";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

async function actorOrReject() {
  if (!(await isSameOriginRequest())) {
    return { ok: false as const, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("customer.b2b.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true as const,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  };
}

function revalidate(id: string) {
  revalidatePath("/admin/customers/b2b");
  revalidatePath(`/admin/customers/b2b/${id}`);
}

export async function approveB2BAccountAction(input: {
  id: string;
  discountPercent: number;
  tier: string;
  notes: string;
}): Promise<SaveB2BResult> {
  const gate = await actorOrReject();
  if (!gate.ok) {
    return gate;
  }
  const result = await approveB2BAccount({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate(input.id);
  }
  return result;
}

export async function updateB2BAccountAction(input: {
  id: string;
  discountPercent: number;
  tier: string;
  notes: string;
}): Promise<SaveB2BResult> {
  const gate = await actorOrReject();
  if (!gate.ok) {
    return gate;
  }
  const result = await updateB2BAccount({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate(input.id);
  }
  return result;
}

export async function setB2BAccountSuspendedAction(input: {
  id: string;
  suspended: boolean;
}): Promise<SaveB2BResult> {
  const gate = await actorOrReject();
  if (!gate.ok) {
    return gate;
  }
  const result = await setB2BAccountSuspended({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate(input.id);
  }
  return result;
}
