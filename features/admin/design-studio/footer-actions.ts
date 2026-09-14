"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveFooterWidgetsConfig,
  type FooterMutationResult,
} from "@/lib/content/footer-settings";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

async function guard(): Promise<FooterMutationResult | null> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  return null;
}

function revalidateFooter() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/design-studio/footer-widgets");
}

export async function saveFooterWidgetsAction(input: {
  config: unknown;
}): Promise<FooterMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveFooterWidgetsConfig({
    config: input.config,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateFooter();
  }
  return result;
}

export async function uploadFooterPaymentImageAction(
  formData: FormData,
): Promise<FooterMutationResult & { path?: string }> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, formError: "Choose an image file." };
  }
  const uploaded = await uploadAdminMediaFiles({
    files: [file],
    folder: "general",
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (!uploaded.ok) {
    return uploaded;
  }
  if (!uploaded.path) {
    return { ok: false, formError: "Upload failed." };
  }
  return { ok: true, id: uploaded.id, path: uploaded.path };
}
