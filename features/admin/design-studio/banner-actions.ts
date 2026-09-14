"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  deleteHomeBanner,
  saveHomeBanner,
  type HomeBannerMutationResult,
} from "@/lib/design/home-banners";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

async function guard(): Promise<HomeBannerMutationResult | null> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  return null;
}

function revalidateBanners() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/design-studio/banners");
}

export async function uploadBannerImageAction(
  formData: FormData,
): Promise<HomeBannerMutationResult & { path?: string }> {
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
    folder: "home",
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

export async function saveHomeBannerAction(input: {
  id?: string;
  slot: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  position: number;
  isActive: boolean;
}): Promise<HomeBannerMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveHomeBanner({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidateBanners();
  }
  return result;
}

export async function deleteHomeBannerAction(
  id: string,
): Promise<HomeBannerMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteHomeBanner(id, {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  });
  if (result.ok) {
    revalidateBanners();
  }
  return result;
}
