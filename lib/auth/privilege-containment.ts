/**
 * Privilege containment for staff and role administration (DSA-03).
 *
 * Authorization elsewhere in the admin answers "may you perform this
 * operation?" — and does so consistently. What was missing is the second
 * question: *how much privilege may this operation hand out?* Without it,
 * three ordinary-looking permissions were each equivalent to full Admin:
 *
 *   staff.add    -> create a new staff account holding the Admin role
 *   staff.edit   -> change your own role to Admin (only self-*disable* was blocked)
 *   roles.manage -> grant your own role every permission, or edit the Admin role
 *
 * The rule enforced here is the standard one for delegated administration:
 * **you cannot grant access you do not hold yourself.** It is deliberately
 * invisible to a real Admin, whose role holds every permission, so no
 * legitimate workflow changes.
 *
 * Permissions are always read fresh from the database rather than taken from
 * the caller, so a stale session cannot widen what it is allowed to delegate.
 */
import { getPrisma } from "@/lib/db/prisma";

export const PRIVILEGE_ESCALATION_ERROR =
  "You cannot grant access that you do not have yourself.";
export const SYSTEM_ROLE_ERROR =
  "This is a built-in system role and its permissions cannot be changed.";
export const SELF_ROLE_ERROR =
  "You cannot change your own role. Ask another administrator.";
export const LAST_ADMIN_ERROR =
  "This is the last account that can manage staff and roles. Give another active staff member that access first.";

/**
 * Permission that gates recovery: whoever holds it can repair every other
 * grant. If no active staff member has it, the panel is unadministrable and
 * only direct database access can fix it.
 */
const RECOVERY_PERMISSION = "roles.manage";

/** Permission keys this staff member currently holds, read fresh. */
export async function permissionKeysForStaff(
  staffId: string,
): Promise<Set<string>> {
  const row = await getPrisma().staff.findUnique({
    where: { id: staffId },
    select: {
      role: {
        select: { permissions: { select: { permission: { select: { key: true } } } } },
      },
    },
  });
  return new Set(
    (row?.role?.permissions ?? []).map((grant) => grant.permission.key),
  );
}

/** Permission keys held by a role, read fresh. */
export async function permissionKeysForRole(
  roleId: string,
): Promise<Set<string>> {
  const row = await getPrisma().role.findUnique({
    where: { id: roleId },
    select: { permissions: { select: { permission: { select: { key: true } } } } },
  });
  return new Set((row?.permissions ?? []).map((g) => g.permission.key));
}

/** Requested keys the actor does not hold. Empty means the grant is contained. */
export function excessPermissions(
  requested: Iterable<string>,
  held: ReadonlySet<string>,
): string[] {
  const excess: string[] = [];
  for (const key of requested) {
    if (!held.has(key)) {
      excess.push(key);
    }
  }
  return excess;
}

/**
 * True when removing this staff member's administrative access would leave
 * nobody able to manage roles.
 *
 * `excludeStaffId` is the person being changed — they are about to lose the
 * access, so they must not count towards the survivors.
 */
export async function wouldStrandAdministration(
  excludeStaffId: string,
): Promise<boolean> {
  const survivors = await getPrisma().staff.count({
    where: {
      id: { not: excludeStaffId },
      status: "ACTIVE",
      role: {
        permissions: { some: { permission: { key: RECOVERY_PERMISSION } } },
      },
    },
  });
  return survivors === 0;
}

/** True when this staff member's role currently grants recovery access. */
export async function holdsRecoveryAccess(staffId: string): Promise<boolean> {
  const held = await permissionKeysForStaff(staffId);
  return held.has(RECOVERY_PERMISSION);
}
