"use server";

import { revalidatePath } from "next/cache";
import { updateAdminProductRequest } from "@/lib/admin/load-product-requests";
import type { ProductRequestStatus } from "@/lib/admin/product-requests-mock";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

export async function saveAdminProductRequestAction(input: {
  id: string;
  status: ProductRequestStatus;
  staffNotes: string;
}): Promise<{ ok: true } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await requireStaffSession();
  if (
    !hasAnyPermission(session, [
      "product_requests.manage",
      "product_requests.view",
    ])
  ) {
    return {
      ok: false,
      formError: "You do not have permission to update requests.",
    };
  }

  const result = await updateAdminProductRequest({
    id: input.id,
    status: input.status,
    staffNotes: input.staffNotes,
  });
  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/product-requests");
  revalidatePath(`/admin/product-requests/${input.id}`);
  revalidatePath("/admin/contacts");
  return { ok: true };
}
