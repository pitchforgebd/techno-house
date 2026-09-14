"use server";

import { getStaffSession } from "@/lib/auth/staff-session";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { getRequestMeta } from "@/lib/auth/request-meta";
import type { MediaFolder } from "@/lib/admin/media-mock";
import {
  listAdminMedia,
  uploadAdminMediaFiles,
} from "@/lib/media/admin-media";

export type MediaPickerItem = {
  id: string;
  path: string;
  filename: string;
  alt: string;
};

const PICKER_PERMISSIONS = [
  "media.upload",
  "media.view",
  "media.delete",
  "category.edit",
  "category.add",
  "brand.edit",
  "brand.add",
  "product.edit",
  "product.add",
] as const;

function canPick(permissions: string[]): boolean {
  return PICKER_PERMISSIONS.some((key) => permissions.includes(key));
}

function canUpload(permissions: string[]): boolean {
  return (
    permissions.includes("media.upload") ||
    permissions.includes("category.edit") ||
    permissions.includes("category.add") ||
    permissions.includes("brand.edit") ||
    permissions.includes("brand.add") ||
    permissions.includes("product.edit") ||
    permissions.includes("product.add")
  );
}

export async function listMediaPickerAction(input?: {
  q?: string;
  folder?: MediaFolder | "all";
}): Promise<
  | { ok: true; items: MediaPickerItem[] }
  | { ok: false; formError: string }
> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await getStaffSession();
  if (!session || !canPick(session.permissions)) {
    return { ok: false, formError: "You do not have access to the media library." };
  }
  const data = await listAdminMedia(
    {
      q: input?.q?.trim() ?? "",
      folder: input?.folder ?? "all",
      sort: "newest",
      page: 1,
    },
    48,
  );
  return {
    ok: true,
    items: data.items.map((item) => ({
      id: item.id,
      path: item.path,
      filename: item.filename,
      alt: item.alt,
    })),
  };
}

export async function uploadMediaPickerAction(
  formData: FormData,
): Promise<
  | { ok: true; path: string; item: MediaPickerItem }
  | { ok: false; formError: string }
> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await getStaffSession();
  if (!session || !canUpload(session.permissions)) {
    return { ok: false, formError: "You do not have permission to upload media." };
  }
  const folderRaw = String(formData.get("folder") ?? "general");
  const folder = (
    ["products", "brands", "home", "general", "categories"].includes(folderRaw)
      ? folderRaw
      : "general"
  ) as MediaFolder;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose an image file." };
  }
  const meta = await getRequestMeta();
  const uploaded = await uploadAdminMediaFiles({
    files: [file],
    folder,
    actor: {
      staffId: session.staffId,
      email: session.email,
      ip: meta.ip,
    },
  });
  if (!uploaded.ok) {
    return uploaded;
  }
  if (!uploaded.path) {
    return { ok: false, formError: "Upload saved but path could not be read." };
  }
  return {
    ok: true,
    path: uploaded.path,
    item: {
      id: uploaded.id,
      path: uploaded.path,
      filename: file.name,
      alt: "",
    },
  };
}
