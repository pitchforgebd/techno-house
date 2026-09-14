"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  type AppearanceColorInput,
  saveAdminNavSettings,
  saveAppearanceSettings,
  saveAuthPageSettings,
  saveTypographySettings,
  saveWatermarkSettings,
  type ThemeMutationResult,
} from "@/lib/design/theme-settings";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

async function guard(): Promise<ThemeMutationResult | null> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  return null;
}

function revalidateTheme() {
  revalidatePath("/", "layout");
  revalidatePath("/admin/design-studio/appearance");
  revalidatePath("/admin/design-studio/typography");
  revalidatePath("/admin/design-studio/auth");
  revalidatePath("/admin/design-studio/admin-navbar");
}

export async function uploadDesignImageAction(
  formData: FormData,
): Promise<ThemeMutationResult & { path?: string }> {
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
  return { ok: true, path: uploaded.path };
}

/**
 * Takes the whole colour input type rather than four named fields, so a token
 * added to `THEME_COLOR_TOKENS` reaches the save path without a second edit
 * here. Authorization, validation and audit logging are unchanged — the
 * permission check below is still what decides whether any of it happens.
 */
export async function saveAppearanceSettingsAction(
  input: AppearanceColorInput,
): Promise<ThemeMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveAppearanceSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidateTheme();
  }
  return result;
}

export async function saveWatermarkSettingsAction(input: {
  enabled: boolean;
  type: string;
  imageSrc: string;
  position: string;
}): Promise<ThemeMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveWatermarkSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidateTheme();
  }
  return result;
}

export async function saveTypographySettingsAction(input: {
  bodyFont: string;
  headingFont: string;
}): Promise<ThemeMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveTypographySettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidateTheme();
  }
  return result;
}

export async function saveAuthPageSettingsAction(input: {
  bgColor: string;
  panelColor: string;
  illustrationSrc: string;
}): Promise<ThemeMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveAuthPageSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidateTheme();
  }
  return result;
}

export async function saveAdminNavSettingsAction(input: {
  bgColor: string;
  textColor: string;
}): Promise<ThemeMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveAdminNavSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/", "layout");
    revalidatePath("/admin", "layout");
  }
  return result;
}
