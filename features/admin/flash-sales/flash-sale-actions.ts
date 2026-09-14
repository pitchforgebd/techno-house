"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  deleteFlashSale,
  saveFlashSale,
  setFlashSaleFeatured,
  setFlashSaleStatus,
  type FlashSaleMutationResult,
} from "@/lib/marketing/flash-sales";
import { revalidatePath } from "next/cache";
import {
  runBulkAction,
  type BulkActionResult,
} from "@/lib/admin/bulk-actions";
import { guardBulkOrigin } from "@/lib/admin/bulk-actions-server";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

async function guardOrigin(): Promise<FlashSaleMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

function revalidateFlashPaths(id?: string) {
  revalidatePath("/admin/flash-sales");
  revalidatePath("/admin/promotions");
  revalidatePath("/flash-sale");
  if (id) {
    revalidatePath(`/admin/flash-sales/${id}`);
  }
}

export async function saveFlashSaleAction(input: {
  id?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  bannerSrc?: string | null;
}): Promise<FlashSaleMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveFlashSale({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateFlashPaths(result.id);
  }
  return result;
}

export async function uploadFlashSaleBannerAction(
  formData: FormData,
): Promise<{ ok: true; path: string } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return { ok: false, formError: allowed.formError };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose a banner image file." };
  }
  const meta = await getRequestMeta();
  const uploaded = await uploadAdminMediaFiles({
    files: [file],
    folder: "flash-sales",
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
  return { ok: true, path: uploaded.path };
}

export async function setFlashSaleStatusAction(input: {
  id: string;
  statusOn: boolean;
}): Promise<FlashSaleMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setFlashSaleStatus({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateFlashPaths(result.id);
  }
  return result;
}

export async function setFlashSaleFeaturedAction(input: {
  id: string;
  featured: boolean;
}): Promise<FlashSaleMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setFlashSaleFeatured({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateFlashPaths(result.id);
  }
  return result;
}

export async function deleteFlashSaleAction(input: {
  id: string;
}): Promise<FlashSaleMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteFlashSale({
    id: input.id,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateFlashPaths();
  }
  return result;
}

export async function bulkSetFlashSaleStatusAction(
  ids: string[],
  statusOn: boolean,
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  const result = await runBulkAction(ids, (id) =>
    setFlashSaleStatus({ id, statusOn, actor }),
  );
  if (result.ok) {
    revalidateFlashPaths();
  }
  return result;
}

export async function bulkDeleteFlashSalesAction(
  ids: string[],
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  const result = await runBulkAction(ids, (id) =>
    deleteFlashSale({ id, actor }),
  );
  if (result.ok) {
    revalidateFlashPaths();
  }
  return result;
}
