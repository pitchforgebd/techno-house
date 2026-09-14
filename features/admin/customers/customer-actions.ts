"use server";

import { revalidatePath } from "next/cache";
import {
  adjustCustomerWallet,
  bulkSetCustomerBanned,
  bulkSetCustomerSuspicious,
  createCustomer,
  setCustomerBanned,
  setCustomerSuspicious,
  updateCustomerProfile,
  type SaveCustomerResult,
} from "@/lib/admin/save-customer";
import type { CustomerStatus } from "@/lib/admin/customers-mock";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

async function actorOrReject(permission: string) {
  if (!(await isSameOriginRequest())) {
    return { ok: false as const, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission(permission);
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

function revalidateCustomer(id?: string) {
  revalidatePath("/admin/customers");
  if (id) {
    revalidatePath(`/admin/customers/${id}`);
  }
}

export async function createCustomerAction(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}): Promise<SaveCustomerResult> {
  const gate = await actorOrReject("customer.add");
  if (!gate.ok) {
    return gate;
  }
  const result = await createCustomer({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidateCustomer(result.id);
  }
  return result;
}

export async function updateCustomerProfileAction(input: {
  id: string;
  status: CustomerStatus;
  notes: string;
}): Promise<SaveCustomerResult> {
  const gate = await actorOrReject("customer.edit");
  if (!gate.ok) {
    return gate;
  }
  const result = await updateCustomerProfile({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidateCustomer(result.id);
  }
  return result;
}

export async function setCustomerBannedAction(input: {
  id: string;
  banned: boolean;
}): Promise<SaveCustomerResult> {
  const gate = await actorOrReject("customer.ban");
  if (!gate.ok) {
    return gate;
  }
  const result = await setCustomerBanned({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidateCustomer(result.id);
  }
  return result;
}

export async function bulkSetCustomerBannedAction(input: {
  ids: string[];
  banned: boolean;
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  const gate = await actorOrReject("customer.ban");
  if (!gate.ok) {
    return gate;
  }
  const result = await bulkSetCustomerBanned({ ...input, actor: gate.actor });
  revalidateCustomer();
  return result;
}

export async function setCustomerSuspiciousAction(input: {
  id: string;
  suspicious: boolean;
}): Promise<SaveCustomerResult> {
  const gate = await actorOrReject("customer.edit");
  if (!gate.ok) {
    return gate;
  }
  const result = await setCustomerSuspicious({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidateCustomer(result.id);
  }
  return result;
}

export async function bulkSetCustomerSuspiciousAction(input: {
  ids: string[];
  suspicious: boolean;
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  const gate = await actorOrReject("customer.edit");
  if (!gate.ok) {
    return gate;
  }
  const result = await bulkSetCustomerSuspicious({ ...input, actor: gate.actor });
  revalidateCustomer();
  return result;
}

export async function adjustCustomerWalletAction(input: {
  id: string;
  amount: number;
  reason?: string;
}): Promise<SaveCustomerResult & { balance?: number }> {
  const gate = await actorOrReject("customer.edit");
  if (!gate.ok) {
    return gate;
  }
  const result = await adjustCustomerWallet({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidateCustomer(result.id);
  }
  return result;
}
