"use server";

import { revalidatePath } from "next/cache";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveB2BProductTerms,
  type SaveB2BTermsResult,
} from "@/lib/b2b/product-terms";

export async function saveB2BProductTermsAction(input: {
  productId: string;
  priceAmount: number;
  minQuantity: number;
}): Promise<SaveB2BTermsResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("customer.b2b.manage");
  if (!allowed.ok) {
    return { ok: false, formError: allowed.formError };
  }

  const result = await saveB2BProductTerms(input);
  if (!result.ok) {
    return result;
  }

  const meta = await getRequestMeta();
  await writeAuditLog({
    actorType: "STAFF",
    actorId: allowed.session.staffId,
    actorLabel: allowed.session.email,
    action: AUDIT_ACTIONS.B2B_UPDATE,
    entityType: "B2BProductPrice",
    entityId: input.productId,
    ip: meta.ip,
    metadata: {
      priceAmount: input.priceAmount,
      minQuantity: input.minQuantity,
    },
  });

  revalidatePath("/admin/customers/b2b/pricing");
  return { ok: true };
}
