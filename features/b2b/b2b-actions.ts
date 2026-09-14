"use server";

import { revalidatePath } from "next/cache";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getRequestMeta } from "@/lib/auth/request-meta";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  updateMyB2BProfile,
  type UpdateB2BProfileResult,
} from "@/lib/b2b/applications";
import {
  registerB2BAccount,
  type B2BRegisterInput,
  type B2BRegisterResult,
} from "@/lib/b2b/registration";

export async function registerB2BAction(
  input: Omit<B2BRegisterInput, "ip" | "userAgent">,
): Promise<B2BRegisterResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const meta = await getRequestMeta();
  return registerB2BAccount({ ...input, ...meta });
}

export async function updateB2BProfileAction(input: {
  company: string;
  contactName: string;
  shopAddress: string;
}): Promise<UpdateB2BProfileResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to update your profile." };
  }
  const result = await updateMyB2BProfile({ ...input, userId: session.userId });
  if (result.ok) {
    revalidatePath("/b2b/profile");
  }
  return result;
}
