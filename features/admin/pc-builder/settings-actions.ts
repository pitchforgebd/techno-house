"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  savePcBuilderEnabled,
  savePcBuilderSlots,
  type PcBuilderSettingsMutationResult,
} from "@/lib/pc-builder/settings";

async function guardOrigin(): Promise<PcBuilderSettingsMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function savePcBuilderEnabledAction(input: {
  enabled: boolean;
}): Promise<PcBuilderSettingsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("pc_builder.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await savePcBuilderEnabled({
    enabled: input.enabled,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/pc-builder");
  }
  return result;
}

export async function savePcBuilderSlotsAction(input: {
  slots: { id: string; enabled: boolean; required: boolean }[];
}): Promise<PcBuilderSettingsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("pc_builder.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await savePcBuilderSlots({
    slots: input.slots,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/pc-builder");
  }
  return result;
}
