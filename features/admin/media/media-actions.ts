"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import type { MediaFolder } from "@/lib/admin/media-mock";
import {
  deleteAdminMedia,
  updateAdminMediaAlt,
  uploadAdminMediaFiles,
  type MediaMutationResult,
} from "@/lib/media/admin-media";

async function guardOrigin(): Promise<MediaMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function uploadMediaAction(
  formData: FormData,
): Promise<MediaMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("media.upload");
  if (!allowed.ok) {
    return allowed;
  }
  const folderRaw = String(formData.get("folder") ?? "general");
  const folder = (
    ["products", "brands", "home", "general", "categories"].includes(folderRaw)
      ? folderRaw
      : "general"
  ) as MediaFolder;
  const files = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);
  const meta = await getRequestMeta();
  const result = await uploadAdminMediaFiles({
    files,
    folder,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/media");
  }
  return result;
}

export async function updateMediaAltAction(input: {
  id: string;
  alt: string;
}): Promise<MediaMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("media.upload");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await updateAdminMediaAlt({
    id: input.id,
    alt: input.alt,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/media");
    revalidatePath(`/admin/media/${result.id}`);
  }
  return result;
}

export async function deleteMediaAction(input: {
  ids: string[];
}): Promise<MediaMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("media.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteAdminMedia({
    ids: input.ids,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/media");
  }
  return result;
}
