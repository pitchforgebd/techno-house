"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  setSubscriberStatus,
  subscribeNewsletter,
  type NewsletterMutationResult,
} from "@/lib/content/newsletter";
import { revalidatePath } from "next/cache";

async function guardOrigin(): Promise<NewsletterMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function subscribeNewsletterAction(input: {
  email: string;
  name?: string;
}): Promise<NewsletterMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const meta = await getRequestMeta();
  const result = await subscribeNewsletter({
    email: input.email,
    name: input.name,
    source: "footer",
    actor: { ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/newsletter");
    revalidatePath("/admin/marketing/subscribers");
    revalidatePath("/admin/marketing");
  }
  return result;
}

export async function setSubscriberStatusAction(input: {
  id: string;
  status: string;
}): Promise<NewsletterMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const newsletter = await staffWithPermission("newsletter.manage");
  const allowed = newsletter.ok
    ? newsletter
    : await staffWithPermission("subscribers.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setSubscriberStatus({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/newsletter");
    revalidatePath("/admin/marketing/subscribers");
  }
  return result;
}
