/**
 * Admin-configurable section order for the Add/Edit Product form (AD-383).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  DEFAULT_PRODUCT_FORM_ORDER,
  normalizeProductFormOrder,
  type ProductFormSectionId,
} from "@/lib/catalog/product-form-layout";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

const SINGLETON_ID = "singleton";

export type ProductFormLayoutMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type ProductFormLayoutActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export async function getAdminProductFormOrder(): Promise<
  ProductFormSectionId[]
> {
  if (!usesDatabase()) {
    return DEFAULT_PRODUCT_FORM_ORDER;
  }
  const row = await getPrisma().adminProductFormLayout.findUnique({
    where: { id: SINGLETON_ID },
    select: { sectionOrderJson: true },
  });
  if (!row?.sectionOrderJson) {
    return DEFAULT_PRODUCT_FORM_ORDER;
  }
  try {
    return normalizeProductFormOrder(JSON.parse(row.sectionOrderJson));
  } catch {
    return DEFAULT_PRODUCT_FORM_ORDER;
  }
}

export async function saveAdminProductFormOrder(input: {
  order: unknown;
  actor: ProductFormLayoutActor;
}): Promise<ProductFormLayoutMutationResult> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError: "Layout order needs the database. Remove DATA_SOURCE=mock to save.",
    };
  }
  const normalized = normalizeProductFormOrder(input.order);
  await getPrisma().adminProductFormLayout.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, sectionOrderJson: JSON.stringify(normalized) },
    update: { sectionOrderJson: JSON.stringify(normalized) },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.PRODUCT_FORM_LAYOUT_UPDATE,
    entityType: "AdminProductFormLayout",
    entityId: SINGLETON_ID,
    metadata: { order: normalized },
    ip: input.actor.ip,
  });
  return { ok: true };
}
