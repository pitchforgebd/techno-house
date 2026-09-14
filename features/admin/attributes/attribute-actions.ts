"use server";

import {
  deleteAdminAttribute,
  saveAdminAttribute,
  type AttributeMutationResult,
} from "@/lib/catalog/admin-attributes";
import type { AttributeInputFields } from "@/lib/catalog/attribute-input";
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

async function guardOrigin(): Promise<AttributeMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function saveAdminAttributeAction(input: {
  currentId?: string;
  fields: AttributeInputFields;
}): Promise<AttributeMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.currentId ? "attribute.edit" : "attribute.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return saveAdminAttribute({
    currentId: input.currentId,
    fields: input.fields,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function deleteAdminAttributeAction(
  id: string,
): Promise<AttributeMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("attribute.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return deleteAdminAttribute({
    id,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function bulkDeleteAdminAttributesAction(
  ids: string[],
): Promise<BulkActionResult> {
  const blocked = await guardBulkOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("attribute.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const actor = {
    staffId: allowed.session.staffId,
    email: allowed.session.email,
    ip: meta.ip,
  };
  return runBulkAction(ids, (id) => deleteAdminAttribute({ id, actor }));
}
