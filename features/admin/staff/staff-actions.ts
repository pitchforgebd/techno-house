"use server";

import { revalidatePath } from "next/cache";
import { saveStaff, type SaveStaffResult } from "@/lib/admin/save-staff";
import type { StaffMemberStatus } from "@/lib/admin/staff-types";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

export async function saveStaffAction(input: {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  roleKey: string;
  status: StaffMemberStatus;
  password?: string;
}): Promise<SaveStaffResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }

  const allowed = await staffWithPermission(input.id ? "staff.edit" : "staff.add");
  if (!allowed.ok) {
    return allowed;
  }

  const meta = await getRequestMeta();
  const result = await saveStaff({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });

  if (result.ok) {
    revalidatePath("/admin/staff");
    revalidatePath(`/admin/staff/${result.id}`);
  }

  return result;
}
