"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { saveSmtpConfig, type SmtpMutationResult } from "@/lib/smtp/config";
import { sendMail } from "@/lib/mail/send";
import { revalidatePath } from "next/cache";

function revalidateSmtp() {
  revalidatePath("/admin/smtp");
}

export async function sendTestEmailAction(input: {
  email: string;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("smtp.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const email = input.email.trim();
  if (!email) {
    return { ok: false, formError: "Enter an email address." };
  }
  return sendMail({
    to: email,
    subject: "Techno House SMTP test",
    text: "This is a test email from Techno House admin — your SMTP settings are working.",
  });
}

export async function saveSmtpConfigAction(input: {
  mailerType: string;
  host: string;
  port: string;
  username: string;
  encryption: string;
  fromAddress: string;
  fromName: string;
}): Promise<SmtpMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("smtp.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveSmtpConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateSmtp();
  }
  return result;
}
