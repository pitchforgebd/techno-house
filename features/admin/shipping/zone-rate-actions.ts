"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveZoneRate,
  type ZoneRateMutationResult,
} from "@/lib/shipping/zone-rates";

export async function saveZoneRateAction(input: {
  id: string;
  baseWeightGrams: string;
  baseRateAmount: string;
  extraRatePerKgAmount: string;
}): Promise<ZoneRateMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("shipping_config.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveZoneRate({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/shipping/rates");
    revalidatePath("/checkout");
  }
  return result;
}
