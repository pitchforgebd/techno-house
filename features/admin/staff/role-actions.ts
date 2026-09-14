"use server";

import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { saveStaffRole } from "@/lib/auth/staff-roles";

export type RoleActionResult =
  { ok: true; key: string } | { ok: false; formError?: string };

export async function saveStaffRoleAction(input: {
  key?: string;
  name: string;
  permissionIds: string[];
}): Promise<RoleActionResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }

  const allowed = await staffWithPermission("roles.manage");
  if (!allowed.ok) {
    return allowed;
  }

  const meta = await getRequestMeta();
  return saveStaffRole({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}
