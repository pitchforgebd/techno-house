"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveFirebaseConfig,
  type FirebaseMutationResult,
} from "@/lib/social/firebase-config";
import {
  saveSocialLoginConfig,
  type SocialMutationResult,
} from "@/lib/social/login-config";
import {
  saveRecaptchaConfig,
  type RecaptchaMutationResult,
} from "@/lib/social/recaptcha-config";
import { revalidatePath } from "next/cache";

export async function saveSocialLoginConfigAction(input: {
  provider: string;
  isEnabled: boolean;
  publicClientId: string;
}): Promise<SocialMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("social_logins.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveSocialLoginConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings/social");
  }
  return result;
}

export async function saveRecaptchaConfigAction(input: {
  isEnabled: boolean;
  siteKey: string;
  scoreThreshold: string;
  pages: Record<string, boolean>;
}): Promise<RecaptchaMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("google_recaptcha.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveRecaptchaConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings/google/recaptcha");
  }
  return result;
}

export async function saveFirebaseConfigAction(input: {
  isEnabled: boolean;
}): Promise<FirebaseMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("firebase.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveFirebaseConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings/google/firebase");
  }
  return result;
}
