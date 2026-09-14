"use server";

import { applyForB2B, type ApplyForB2BResult } from "@/lib/b2b/applications";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function applyForB2BAction(
  formData: FormData,
): Promise<ApplyForB2BResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }

  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to your account first." };
  }

  const result = await applyForB2B({
    userId: session.userId,
    company: String(formData.get("company") ?? ""),
    contactName: String(formData.get("contactName") ?? ""),
    shopAddress: String(formData.get("shopAddress") ?? ""),
    tradeLicenceFile: formData.get("tradeLicence") as File | null,
    nidFile: formData.get("nid") as File | null,
  });

  return result;
}
