"use server";

import { revalidatePath } from "next/cache";
import {
  getAdminProductFormOrder,
  saveAdminProductFormOrder,
  type ProductFormLayoutMutationResult,
} from "@/lib/admin/product-form-layout";
import type { ProductFormSectionId } from "@/lib/catalog/product-form-layout";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function loadProductFormOrderAction(): Promise<
  ProductFormSectionId[]
> {
  return getAdminProductFormOrder();
}

export async function saveAdminProductFormOrderAction(
  order: string[],
): Promise<ProductFormLayoutMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("product.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveAdminProductFormOrder({
    order,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/products/new");
    revalidatePath("/admin/catalog/product-form-layout");
  }
  return result;
}
