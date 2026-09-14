"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveStorefrontBrandAssets,
  type BusinessMutationResult,
} from "@/lib/business/config";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

async function guard(): Promise<BusinessMutationResult | null> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("business.manage");
  if (!allowed.ok) {
    return allowed;
  }
  return null;
}

function revalidateStorefront() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings/general");
  revalidatePath("/admin/design-studio/logo");
  revalidatePath("/admin/design-studio/footer");
}

export async function saveBrandContactAction(input: {
  phone: string;
  supportEmail: string;
  storeName?: string;
  address?: string;
}): Promise<BusinessMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("business.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveStorefrontBrandAssets({
    phone: input.phone,
    supportEmail: input.supportEmail,
    storeName: input.storeName,
    address: input.address,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateStorefront();
  }
  return result;
}

export async function uploadBrandLogoAction(
  formData: FormData,
): Promise<BusinessMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("business.manage");
  if (!allowed.ok) {
    return allowed;
  }

  const slot = String(formData.get("slot") ?? "");
  if (slot !== "logoSrc" && slot !== "faviconSrc") {
    return { ok: false, formError: "Unknown logo slot." };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose an image file." };
  }

  const meta = await getRequestMeta();
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
    return { ok: false, formError: "Upload saved but path could not be read." };
  }

  const result = await saveStorefrontBrandAssets({
    [slot]: uploaded.path,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateStorefront();
  }
  return result;
}

/** Rendered logo height, set from Design Studio -> Logo & favicon. */
export async function saveLogoHeightAction(
  logoHeightPx: number,
): Promise<BusinessMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("business.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveStorefrontBrandAssets({
    logoHeightPx,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateStorefront();
  }
  return result;
}
