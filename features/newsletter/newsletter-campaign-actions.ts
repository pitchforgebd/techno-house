"use server";

import { revalidatePath } from "next/cache";
import {
  createAndSendCampaign,
  type SendCampaignResult,
} from "@/lib/content/newsletter-campaigns";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function sendCampaignAction(input: {
  subject: string;
  body: string;
}): Promise<SendCampaignResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("newsletter.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await createAndSendCampaign({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/newsletter");
  }
  return result;
}
