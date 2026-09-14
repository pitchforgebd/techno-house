/**
 * Role catalogue and grants against PostgreSQL (P11-T04).
 */
import {
  AUDIT_ACTIONS,
  permissionDiff,
  writeAuditLog,
} from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  excessPermissions,
  permissionKeysForStaff,
  PRIVILEGE_ESCALATION_ERROR,
  SYSTEM_ROLE_ERROR,
} from "@/lib/auth/privilege-containment";

export type StaffRoleRecord = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissionIds: string[];
};

function slugRoleKey(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug ? `role-${slug}` : "role-custom";
}

export async function listStaffRoles(): Promise<StaffRoleRecord[]> {
  const rows = await getPrisma().role.findMany({
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    select: {
      id: true,
      key: true,
      name: true,
      isSystem: true,
      permissions: {
        select: { permission: { select: { key: true } } },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    name: row.name,
    isSystem: row.isSystem,
    permissionIds: row.permissions.map((grant) => grant.permission.key),
  }));
}

export async function getStaffRoleByKey(
  key: string,
): Promise<StaffRoleRecord | null> {
  const row = await getPrisma().role.findUnique({
    where: { key },
    select: {
      id: true,
      key: true,
      name: true,
      isSystem: true,
      permissions: {
        select: { permission: { select: { key: true } } },
      },
    },
  });
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    isSystem: row.isSystem,
    permissionIds: row.permissions.map((grant) => grant.permission.key),
  };
}

async function uniqueRoleKey(name: string): Promise<string> {
  const prisma = getPrisma();
  const base = slugRoleKey(name);
  let candidate = base;
  let n = 2;
  while (await prisma.role.findUnique({ where: { key: candidate } })) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function saveStaffRole(input: {
  key?: string;
  name: string;
  permissionIds: string[];
  actor?: { staffId: string; email: string; ip?: string | null };
}): Promise<{ ok: true; key: string } | { ok: false; formError: string }> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, formError: "Enter a role name." };
  }
  if (name.length > 80) {
    return { ok: false, formError: "Role name is too long." };
  }

  const prisma = getPrisma();
  const requested = [...new Set(input.permissionIds.map((id) => id.trim()))];
  const permissions = await prisma.permission.findMany({
    where: { key: { in: requested } },
    select: { id: true, key: true },
  });
  const afterKeys = permissions.map((permission) => permission.key);

  // --- Privilege containment (DSA-03) ------------------------------------
  //
  // `roles.manage` used to allow granting any permission to any role,
  // including the actor's own and including the built-in Admin role — so the
  // permission was silently equivalent to full Admin. A grant is now bounded
  // by what the actor holds, which never restricts a real Admin.
  if (input.actor) {
    const actorKeys = await permissionKeysForStaff(input.actor.staffId);
    const excess = excessPermissions(afterKeys, actorKeys);
    if (excess.length > 0) {
      return { ok: false, formError: PRIVILEGE_ESCALATION_ERROR };
    }
  }

  async function recordRoleAudit(
    action: string,
    roleId: string,
    roleKey: string,
    beforeKeys: readonly string[],
  ): Promise<void> {
    if (!input.actor) {
      return;
    }
    const diff = permissionDiff(beforeKeys, afterKeys);
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action,
      entityType: "Role",
      entityId: roleId,
      ip: input.actor.ip,
      metadata: {
        key: roleKey,
        name,
        grantCount: afterKeys.length,
        added: diff.added,
        removed: diff.removed,
      },
    });
  }

  if (input.key) {
    const existing = await prisma.role.findUnique({
      where: { key: input.key },
      select: {
        id: true,
        isSystem: true,
        permissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });
    if (!existing) {
      return { ok: false, formError: "That role no longer exists." };
    }

    // `Role.isSystem` existed in the schema and was seeded (`role-admin`) with
    // the comment that Admin "must not be deletable from the UI", but nothing
    // ever read it as a guard. Without this, a `roles.manage` holder could
    // strip permissions from the Admin role and leave the panel
    // unadministrable.
    if (existing.isSystem) {
      return { ok: false, formError: SYSTEM_ROLE_ERROR };
    }

    const before = existing.permissions.map((grant) => grant.permission.key);

    await prisma.$transaction([
      prisma.role.update({
        where: { id: existing.id },
        data: { name },
      }),
      prisma.rolePermission.deleteMany({ where: { roleId: existing.id } }),
      ...(permissions.length > 0
        ? [
            prisma.rolePermission.createMany({
              data: permissions.map((permission) => ({
                roleId: existing.id,
                permissionId: permission.id,
              })),
            }),
          ]
        : []),
    ]);

    await recordRoleAudit(
      AUDIT_ACTIONS.ROLE_UPDATE,
      existing.id,
      input.key,
      before,
    );

    return { ok: true, key: input.key };
  }

  const key = await uniqueRoleKey(name);
  const created = await prisma.role.create({
    data: {
      key,
      name,
      isSystem: false,
    },
    select: { id: true, key: true },
  });

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        roleId: created.id,
        permissionId: permission.id,
      })),
    });
  }

  await recordRoleAudit(AUDIT_ACTIONS.ROLE_CREATE, created.id, created.key, []);

  return { ok: true, key: created.key };
}
