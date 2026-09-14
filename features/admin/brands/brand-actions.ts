"use server";

import { revalidatePath } from "next/cache";
import {
  deleteAdminBrand,
  saveAdminBrand,
  type BrandMutationResult,
} from "@/lib/catalog/admin-brands";
import type { BrandInputFields } from "@/lib/catalog/brand-input";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";
import {
  runBulkAction,
  type BulkActionResult,
} from "@/lib/admin/bulk-actions";
import { guardBulkOrigin } from "@/lib/admin/bulk-actions-server";

async function guardOrigin(): Promise<BrandMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

function revalidateBrandSurfaces(slug: string) {
  revalidatePath("/admin/brands");
  revalidatePath(`/admin/brands/${slug}`);
  revalidatePath("/brands");
  revalidatePath(`/brand/${slug}`);
  revalidatePath("/", "layout");
}

export async function saveAdminBrandAction(input: {
  currentSlug?: string;
  fields: BrandInputFields;
}): Promise<BrandMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.currentSlug ? "brand.edit" : "brand.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveAdminBrand({
    currentSlug: input.currentSlug,
    fields: input.fields,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateBrandSurfaces(result.slug);
    if (input.currentSlug && input.currentSlug !== result.slug) {
      revalidatePath(`/admin/brands/${input.currentSlug}`);
      revalidatePath(`/brand/${input.currentSlug}`);
    }
  }
  return result;
}

export async function uploadBrandLogoAction(
  formData: FormData,
): Promise<{ ok: true; path: string } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowedEdit = await staffWithPermission("brand.edit");
  const allowed = allowedEdit.ok
    ? allowedEdit
    : await staffWithPermission("brand.add");
  if (!allowed.ok) {
    return { ok: false, formError: allowed.formError };
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose a logo image file." };
  }
  const meta = await getRequestMeta();
  const uploaded = await uploadAdminMediaFiles({
    files: [file],
    folder: "brands",
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

export async function deleteAdminBrandAction(
  slug: string,
): Promise<BrandMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("brand.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteAdminBrand({
    slug,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateBrandSurfaces(result.slug);
  }
  return result;
}

export async function bulkDeleteAdminBrandsAction(
  slugs: string[],
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("brand.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  return runBulkAction(slugs, async (slug) => {
    const outcome = await deleteAdminBrand({ slug, actor });
    if (outcome.ok) {
      revalidateBrandSurfaces(outcome.slug);
    }
    return outcome;
  });
}
