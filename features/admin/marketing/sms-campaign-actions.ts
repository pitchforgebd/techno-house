"use server";

import { revalidatePath } from "next/cache";
import {
  createAndSendSmsCampaign,
  type SendCampaignResult,
  type SmsAudience,
} from "@/lib/sms/campaigns";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function sendSmsCampaignAction(input: {
  message: string;
  audience: SmsAudience;
}): Promise<SendCampaignResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("otp.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await createAndSendSmsCampaign({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/marketing/sms");
  }
  return result;
}
