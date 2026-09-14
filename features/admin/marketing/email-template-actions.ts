"use server";

import { revalidatePath } from "next/cache";
import {
  saveEmailTemplate,
  sendTestEmailTemplate,
  setEmailTemplateEnabled,
  type SaveResult,
} from "@/lib/mail/templates";
import type { SendMailResult } from "@/lib/mail/send";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

async function actorOrReject() {
  if (!(await isSameOriginRequest())) {
    return { ok: false as const, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("email_templates.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true as const,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  };
}

export async function saveEmailTemplateAction(input: {
  id: string;
  subject: string;
  body: string;
}): Promise<SaveResult> {
  const gate = await actorOrReject();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveEmailTemplate({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidatePath("/admin/marketing/email-templates");
  }
  return result;
}

export async function setEmailTemplateEnabledAction(input: {
  id: string;
  enabled: boolean;
}): Promise<SaveResult> {
  const gate = await actorOrReject();
  if (!gate.ok) {
    return gate;
  }
  const result = await setEmailTemplateEnabled({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidatePath("/admin/marketing/email-templates");
  }
  return result;
}

export async function sendTestEmailTemplateAction(input: {
  id: string;
  to: string;
}): Promise<SendMailResult> {
  const gate = await actorOrReject();
  if (!gate.ok) {
    return gate;
  }
  return sendTestEmailTemplate(input);
}
