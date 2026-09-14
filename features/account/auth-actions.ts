"use server";

import {
  changeCustomerPassword,
  loginCustomer,
  logoutCustomer,
  registerCustomer,
  requestPasswordReset,
  updateCustomerProfile,
  verifyAuthOtp,
  type AuthActionResult,
} from "@/lib/auth/customer-auth";
import { getRequestMeta } from "@/lib/auth/request-meta";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

async function guardOrigin(): Promise<AuthActionResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function registerCustomerAction(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const meta = await getRequestMeta();
  return registerCustomer({ ...input, ...meta });
}

export async function loginCustomerAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const meta = await getRequestMeta();
  return loginCustomer({ ...input, ...meta });
}

export async function verifyAuthOtpAction(input: {
  token: string;
  code: string;
}): Promise<AuthActionResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const meta = await getRequestMeta();
  return verifyAuthOtp({
    token: input.token,
    code: input.code,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}

export async function logoutCustomerAction(): Promise<void> {
  if (!(await isSameOriginRequest())) {
    return;
  }
  await logoutCustomer();
}

export async function updateCustomerProfileAction(input: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<AuthActionResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  return updateCustomerProfile(input);
}

export async function requestPasswordResetAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const meta = await getRequestMeta();
  return requestPasswordReset({ ...input, ip: meta.ip });
}

export async function changeCustomerPasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AuthActionResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const meta = await getRequestMeta();
  return changeCustomerPassword({
    ...input,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
}
