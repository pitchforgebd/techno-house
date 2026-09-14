"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { saveOtpSmsConfig, type OtpMutationResult } from "@/lib/otp/config";
import { sendSms } from "@/lib/sms/send";
import { revalidatePath } from "next/cache";

function revalidateOtp() {
  revalidatePath("/admin/otp");
}

export async function sendTestOtpAction(input: {
  phone: string;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("otp.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const phone = input.phone.trim();
  if (!phone) {
    return { ok: false, formError: "Enter a phone number." };
  }
  return sendSms({
    to: phone,
    message: "Techno House test message: your OTP gateway is working.",
  });
}

export async function saveOtpSmsConfigAction(input: {
  provider: string;
  senderId: string;
  otpLength: string;
  expiryMinutes: string;
  otpLogin: boolean;
  otpRegistration: boolean;
}): Promise<OtpMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("otp.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveOtpSmsConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateOtp();
  }
  return result;
}
