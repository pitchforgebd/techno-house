/**
 * Real staff account create/update (AD-255). Passwords are Argon2id-hashed
 * before storage; a plaintext password is never persisted or logged
 * (writeAuditLog also strips password-shaped keys as a second layer).
 */
import {
  isValidEmail,
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
  validatePassword,
} from "@/lib/account/validation";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { hashPassword } from "@/lib/auth/password";
import { getPrisma } from "@/lib/db/prisma";
import {
  excessPermissions,
  holdsRecoveryAccess,
  LAST_ADMIN_ERROR,
  permissionKeysForRole,
  permissionKeysForStaff,
  PRIVILEGE_ESCALATION_ERROR,
  SELF_ROLE_ERROR,
  wouldStrandAdministration,
} from "@/lib/auth/privilege-containment";
import type { StaffStatus as DbStaffStatus } from "@/lib/generated/prisma/enums";
import type { StaffMemberStatus } from "@/lib/admin/staff-types";

export type SaveStaffInput = {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  roleKey: string;
  status: StaffMemberStatus;
  password?: string;
  actor: { staffId: string; email: string; ip?: string | null };
};

export type SaveStaffResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

const STATUS_TO_DB: Record<StaffMemberStatus, DbStaffStatus> = {
  active: "ACTIVE",
  invited: "INVITED",
  disabled: "DISABLED",
};

function isUniqueEmailConflict(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002",
  );
}

export async function saveStaff(input: SaveStaffInput): Promise<SaveStaffResult> {
  const fullName = normalizeFullName(input.fullName);
  if (!fullName) {
    return { ok: false, formError: "Enter a name." };
  }
  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    return { ok: false, formError: "Enter a valid email." };
  }
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return { ok: false, formError: "Enter a phone number." };
  }
  const roleKey = input.roleKey.trim();
  if (!roleKey) {
    return { ok: false, formError: "Choose a role." };
  }

  if (input.id && input.id === input.actor.staffId && input.status !== "active") {
    return { ok: false, formError: "You cannot disable your own account." };
  }

  const prisma = getPrisma();
  const role = await prisma.role.findUnique({
    where: { key: roleKey },
    select: { id: true },
  });
  if (!role) {
    return { ok: false, formError: "That role no longer exists." };
  }

  // --- Privilege containment (DSA-03) ------------------------------------
  //
  // Holding `staff.add` or `staff.edit` used to be enough to mint an Admin,
  // or to promote yourself into one, because the only thing checked about
  // `roleKey` was that the role existed. Both are now bounded by what the
  // actor actually holds, which is a no-op for a real Admin (their role holds
  // every permission) and a hard stop for anyone below them.
  const existingStaff = input.id
    ? await prisma.staff.findUnique({
        where: { id: input.id },
        select: { roleId: true, status: true },
      })
    : null;
  if (input.id && !existingStaff) {
    return { ok: false, formError: "That staff member no longer exists." };
  }

  const changingRole = existingStaff ? existingStaff.roleId !== role.id : true;

  // Self-promotion. Disabling yourself was already blocked above; promoting
  // yourself was not, which was the simplest escalation of the three.
  if (input.id === input.actor.staffId && changingRole) {
    return { ok: false, formError: SELF_ROLE_ERROR };
  }

  if (changingRole) {
    const [actorKeys, roleKeys] = await Promise.all([
      permissionKeysForStaff(input.actor.staffId),
      permissionKeysForRole(role.id),
    ]);
    if (excessPermissions(roleKeys, actorKeys).length > 0) {
      return { ok: false, formError: PRIVILEGE_ESCALATION_ERROR };
    }
  }

  // Do not let the panel be left with nobody who can administer it — whether
  // by moving the last such account to a weaker role or by disabling it.
  if (input.id && existingStaff) {
    const losingAccess =
      (changingRole || input.status !== "active") &&
      (await holdsRecoveryAccess(input.id));
    if (losingAccess && (await wouldStrandAdministration(input.id))) {
      return { ok: false, formError: LAST_ADMIN_ERROR };
    }
  }

  let passwordHash: string | undefined;
  if (input.password) {
    const passwordError = validatePassword(input.password);
    if (passwordError) {
      return { ok: false, formError: passwordError };
    }
    passwordHash = await hashPassword(input.password);
  }

  if (!input.id) {
    if (!passwordHash) {
      return {
        ok: false,
        formError: "Enter a password for the new staff member.",
      };
    }
    try {
      const created = await prisma.staff.create({
        data: {
          fullName,
          email,
          phone,
          roleId: role.id,
          status: STATUS_TO_DB[input.status],
          passwordHash,
        },
        select: { id: true },
      });
      await writeAuditLog({
        actorType: "STAFF",
        actorId: input.actor.staffId,
        actorLabel: input.actor.email,
        action: AUDIT_ACTIONS.STAFF_CREATE,
        entityType: "Staff",
        entityId: created.id,
        ip: input.actor.ip,
        metadata: { email, roleKey, status: input.status },
      });
      return { ok: true, id: created.id };
    } catch (error) {
      if (isUniqueEmailConflict(error)) {
        return {
          ok: false,
          formError: "That email is already used by another staff member.",
        };
      }
      throw error;
    }
  }

  const existing = await prisma.staff.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That staff member no longer exists." };
  }

  try {
    await prisma.staff.update({
      where: { id: existing.id },
      data: {
        fullName,
        email,
        phone,
        roleId: role.id,
        status: STATUS_TO_DB[input.status],
        ...(passwordHash ? { passwordHash } : {}),
      },
    });
  } catch (error) {
    if (isUniqueEmailConflict(error)) {
      return {
        ok: false,
        formError: "That email is already used by another staff member.",
      };
    }
    throw error;
  }

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.STAFF_UPDATE,
    entityType: "Staff",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: {
      email,
      roleKey,
      status: input.status,
      passwordChanged: Boolean(passwordHash),
    },
  });

  return { ok: true, id: existing.id };
}
