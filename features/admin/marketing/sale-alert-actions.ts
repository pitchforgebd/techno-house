"use server";

import { revalidatePath } from "next/cache";
import {
  saveSaleAlertSettings,
  type SaleAlertProductScope,
  type SaveResult,
} from "@/lib/marketing/sale-alerts";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function saveSaleAlertSettingsAction(input: {
  enabled: boolean;
  minIntervalSeconds: number;
  maxIntervalSeconds: number;
  productScope: SaleAlertProductScope;
  manualProductIds: string[];
}): Promise<SaveResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("alerts.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveSaleAlertSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/marketing/sale-alerts");
  }
  return result;
}
