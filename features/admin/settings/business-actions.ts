"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveBusinessSettings,
  type BusinessMutationResult,
} from "@/lib/business/config";
import { revalidatePath } from "next/cache";

export async function saveBusinessSettingsAction(input: {
  storeName: string;
  legalName: string;
  supportEmail: string;
  phone: string;
  address: string;
  city: string;
  timezone: string;
  taxId: string;
  googleMapsUrl: string;
}): Promise<BusinessMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("business.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveBusinessSettings({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings");
    revalidatePath("/admin/settings/general");
    revalidatePath("/", "layout");
  }
  return result;
}
