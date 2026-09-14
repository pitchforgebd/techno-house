/**
 * Staff permission checks (P11-T04).
 *
 * UI hiding is not a control — mutations and panel routes must call these.
 */
import { hasPermission } from "@/lib/auth/permission-check";
import {
  getStaffSession,
  type StaffSessionView,
} from "@/lib/auth/staff-session";

export { hasAnyPermission, hasPermission } from "@/lib/auth/permission-check";

export const PERMISSION_DENIED = "You do not have permission to do that.";

export async function staffWithPermission(
  key: string,
): Promise<
  { ok: true; session: StaffSessionView } | { ok: false; formError: string }
> {
  const session = await getStaffSession();
  if (!session) {
    return { ok: false, formError: "Sign in to continue." };
  }
  if (!hasPermission(session, key)) {
    return { ok: false, formError: PERMISSION_DENIED };
  }
  return { ok: true, session };
}
