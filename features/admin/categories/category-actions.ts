"use server";

import { revalidatePath } from "next/cache";
import {
  deleteAdminCategory,
  saveAdminCategory,
  setCategoryFeatured,
  setCategoryHot,
  type CategoryMutationResult,
} from "@/lib/catalog/admin-categories";
import type { CategoryInputFields } from "@/lib/catalog/category-input";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  runBulkAction,
  type BulkActionResult,
} from "@/lib/admin/bulk-actions";
import { guardBulkOrigin } from "@/lib/admin/bulk-actions-server";

async function guardOrigin(): Promise<CategoryMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

function revalidateCategorySurfaces(slug: string) {
  revalidatePath("/admin/categories");
  revalidatePath(`/admin/categories/${slug}`);
  revalidatePath(`/category/${slug}`);
  revalidatePath("/", "layout");
}

export async function saveAdminCategoryAction(input: {
  currentSlug?: string;
  fields: CategoryInputFields;
}): Promise<CategoryMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.currentSlug ? "category.edit" : "category.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveAdminCategory({
    currentSlug: input.currentSlug,
    fields: input.fields,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateCategorySurfaces(result.slug);
    if (input.currentSlug && input.currentSlug !== result.slug) {
      revalidatePath(`/admin/categories/${input.currentSlug}`);
      revalidatePath(`/category/${input.currentSlug}`);
    }
  }
  return result;
}

export async function deleteAdminCategoryAction(
  slug: string,
): Promise<CategoryMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("category.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteAdminCategory({
    slug,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateCategorySurfaces(result.slug);
  }
  return result;
}

export async function bulkDeleteAdminCategoriesAction(
  slugs: string[],
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("category.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  const result = await runBulkAction(slugs, async (slug) => {
    const outcome = await deleteAdminCategory({ slug, actor });
    if (outcome.ok) {
      revalidateCategorySurfaces(outcome.slug);
    }
    return outcome;
  });
  return result;
}

export async function bulkSetAdminCategoriesFeaturedAction(
  slugs: string[],
  isFeatured: boolean,
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("category.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  const result = await runBulkAction(slugs, (slug) =>
    setCategoryFeatured({ slug, isFeatured, actor }),
  );
  if (result.ok) {
    revalidatePath("/admin/categories");
  }
  return result;
}

export async function setCategoryFeaturedAction(
  slug: string,
  isFeatured: boolean,
): Promise<CategoryMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("category.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setCategoryFeatured({
    slug,
    isFeatured,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/categories");
  }
  return result;
}

export async function setCategoryHotAction(
  slug: string,
  isHot: boolean,
): Promise<CategoryMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("category.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setCategoryHot({
    slug,
    isHot,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/categories");
  }
  return result;
}
