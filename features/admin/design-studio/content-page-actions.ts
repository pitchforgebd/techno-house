"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveContentPage,
  type ContentPageMutationResult,
} from "@/lib/content/pages";

export async function saveContentPageAction(input: {
  slug: string;
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
}): Promise<ContentPageMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveContentPage({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath(`/${input.slug}`);
    revalidatePath("/admin/design-studio/pages");
    revalidatePath(`/admin/design-studio/pages/${input.slug}`);
  }
  return result;
}
