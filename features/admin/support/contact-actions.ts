"use server";

import { revalidatePath } from "next/cache";
import { updateAdminContact } from "@/lib/admin/load-support";
import type { ContactStatus } from "@/lib/admin/support-mock";
import { hasAnyPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

export async function saveAdminContactAction(input: {
  id: string;
  status: ContactStatus;
  reply: string;
  staffNotes: string;
}): Promise<
  { ok: true; mailWarning?: string } | { ok: false; formError: string }
> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const session = await requireStaffSession();
  if (
    !hasAnyPermission(session, ["contacts.manage", "contacts.view"])
  ) {
    return {
      ok: false,
      formError: "You do not have permission to update contacts.",
    };
  }

  const result = await updateAdminContact(input);
  if (!result.ok) {
    return result;
  }

  revalidatePath("/admin/contacts");
  revalidatePath(`/admin/contacts/${input.id}`);
  revalidatePath("/admin/product-requests");
  return result;
}
