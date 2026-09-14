"use server";

import {
  cloneAdminProduct,
  deleteAdminProduct,
  saveAdminProduct,
  updateAdminProductFlags,
  type ProductMutationResult,
} from "@/lib/catalog/admin-products";
import { searchRelatedProductCandidates } from "@/lib/catalog/product-related";
import { updateAdminProductStock } from "@/lib/catalog/admin-inventory";
import type { InventoryInputFields } from "@/lib/catalog/inventory-input";
import type { ProductInputFields } from "@/lib/catalog/product-input";
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

async function guardOrigin(): Promise<ProductMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function saveAdminProductAction(input: {
  currentId?: string;
  fields: ProductInputFields;
}): Promise<ProductMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.currentId ? "product.edit" : "product.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return saveAdminProduct({
    currentId: input.currentId,
    fields: input.fields,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function updateAdminProductFlagsAction(input: {
  id: string;
  published?: boolean;
  featured?: boolean;
  todaysDeal?: boolean;
}): Promise<ProductMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("product.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return updateAdminProductFlags({
    id: input.id,
    published: input.published,
    featured: input.featured,
    todaysDeal: input.todaysDeal,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function updateAdminProductStockAction(input: {
  productId: string;
  fields: InventoryInputFields;
}): Promise<ProductMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("product.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return updateAdminProductStock({
    productId: input.productId,
    fields: input.fields,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function deleteAdminProductAction(
  id: string,
): Promise<ProductMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("product.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return deleteAdminProduct({
    id,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

/** Real deep clone — was "Product duplicated (mock)" / "Product cloned (mock)". */
export async function cloneAdminProductAction(
  id: string,
): Promise<ProductMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("product.add");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return cloneAdminProduct(id, {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  });
}

export async function bulkDeleteAdminProductsAction(
  ids: string[],
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("product.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  return runBulkAction(ids, (id) => deleteAdminProduct({ id, actor }));
}

export async function bulkSetAdminProductPublishedAction(
  ids: string[],
  published: boolean,
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("product.edit");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  return runBulkAction(ids, (id) =>
    updateAdminProductFlags({ id, published, actor }),
  );
}

/** Search results for the "Add frequently bought item" picker. */
export async function searchRelatedProductCandidatesAction(input: {
  query: string;
  excludeId?: string;
}): Promise<{ id: string; slug: string; name: string }[]> {
  if (!(await isSameOriginRequest())) {
    return [];
  }
  const allowed = await staffWithPermission("product.edit");
  if (!allowed.ok) {
    return [];
  }
  return searchRelatedProductCandidates(input);
}
