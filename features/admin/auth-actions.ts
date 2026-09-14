"use server";

import {
  loginStaff,
  logoutStaff,
  type StaffAuthResult,
} from "@/lib/auth/staff-auth";
import { getRequestMeta } from "@/lib/auth/request-meta";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

export async function loginStaffAction(input: {
  email: string;
  password: string;
}): Promise<StaffAuthResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const meta = await getRequestMeta();
  return loginStaff({ ...input, ...meta });
}

export async function logoutStaffAction(): Promise<void> {
  if (!(await isSameOriginRequest())) {
    return;
  }
  await logoutStaff();
}
