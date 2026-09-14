/**
 * Admin media list/detail loaders (PostgreSQL MediaAsset).
 */
import {
  ADMIN_MEDIA_PAGE_SIZE,
  type MediaListParams,
} from "@/lib/admin/support-list-params";
import {
  getAdminMedia,
  listAdminMedia,
  type AdminMediaListResult,
} from "@/lib/media/admin-media";
import type { AdminMediaAsset } from "@/lib/admin/media-mock";

export type { AdminMediaListResult };

export async function loadAdminMediaList(
  params: MediaListParams,
): Promise<AdminMediaListResult> {
  return listAdminMedia(params, ADMIN_MEDIA_PAGE_SIZE);
}

export async function getAdminMediaById(
  id: string,
): Promise<AdminMediaAsset | null> {
  return getAdminMedia(id);
}
