"use server";

import { revalidatePath } from "next/cache";
import {
  saveVisitorWidgetSettings,
  type SaveResult,
} from "@/lib/marketing/visitor-widget-settings";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function saveVisitorWidgetSettingsAction(input: {
  enabled: boolean;
  windowMinutes: number;
  minToShow: number;
}): Promise<SaveResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveVisitorWidgetSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/marketing/visitors");
  }
  return result;
}
