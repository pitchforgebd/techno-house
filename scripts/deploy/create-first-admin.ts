/**
 * Production first-admin bootstrap.
 *
 *   OWNER_EMAIL=you@example.com OWNER_PASSWORD='...' OWNER_NAME='Your Name' \
 *     npm run staff:bootstrap-owner
 *
 * `prisma/seed.ts` refuses to run at all in production (it loads the demo
 * catalogue). But the RBAC tables it also seeds — Permission, Role,
 * RolePermission — are not demo data; they are reference data the app needs
 * to let ANY staff member sign in with real permissions. A fresh production
 * database has none of them, so there is otherwise no way to reach Admin at
 * all on a brand-new deploy.
 *
 * This script seeds only that reference data (upsert, safe to re-run) plus
 * ONE real staff account with the full "role-admin" role, sourced from env
 * vars — never a hardcoded credential. It touches no catalogue, order, or
 * customer data.
 */
import { config as loadEnvFiles } from "dotenv";

// Standalone scripts, unlike `next dev`/`next build`, do not auto-load .env
// files — every other script here that touches getPrisma() does this same
// load first (see scripts/db/preflight.ts).
loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

import { hashPassword } from "../../lib/auth/password";
import { getPrisma } from "../../lib/db/prisma";
import {
  FEATURE_PERMISSION_GROUPS,
  MOCK_STAFF_ROLES,
} from "../../lib/admin/feature-permissions-mock";

async function main(): Promise<void> {
  const email = process.env.OWNER_EMAIL?.trim();
  const password = process.env.OWNER_PASSWORD;
  const fullName = process.env.OWNER_NAME?.trim() || "Admin";

  if (!email || !password) {
    console.error(
      "Set OWNER_EMAIL and OWNER_PASSWORD (and optionally OWNER_NAME) before running this.",
    );
    process.exitCode = 1;
    return;
  }
  if (password.length < 12) {
    console.error("OWNER_PASSWORD must be at least 12 characters.");
    process.exitCode = 1;
    return;
  }

  // Constructed only once inputs are valid, so an early exit above never
  // opens a database connection just to immediately close it.
  const prisma = getPrisma();

  for (const group of FEATURE_PERMISSION_GROUPS) {
    for (const permission of group.permissions) {
      await prisma.permission.upsert({
        where: { key: permission.id },
        create: { key: permission.id, groupKey: group.id, label: permission.label },
        update: { groupKey: group.id, label: permission.label },
      });
    }
  }

  for (const role of MOCK_STAFF_ROLES) {
    const isSystem = role.id === "role-admin";
    const record = await prisma.role.upsert({
      where: { key: role.id },
      create: { key: role.id, name: role.name, isSystem },
      update: { name: role.name, isSystem },
    });

    const permissions = await prisma.permission.findMany({
      where: { key: { in: [...role.permissionIds] } },
      select: { id: true },
    });
    const existing = await prisma.rolePermission.findMany({
      where: { roleId: record.id },
      select: { permissionId: true },
    });
    const have = new Set(existing.map((row) => row.permissionId));
    const missing = permissions.filter((permission) => !have.has(permission.id));
    if (missing.length > 0) {
      await prisma.rolePermission.createMany({
        data: missing.map((permission) => ({
          roleId: record.id,
          permissionId: permission.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { key: "role-admin" },
    select: { id: true },
  });
  const passwordHash = await hashPassword(password);
  await prisma.staff.upsert({
    where: { email },
    create: {
      email,
      fullName,
      passwordHash,
      status: "ACTIVE",
      roleId: adminRole.id,
    },
    update: {
      fullName,
      passwordHash,
      status: "ACTIVE",
      roleId: adminRole.id,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  console.log(`ok — staff account ready: ${email} (role: Admin, all permissions)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (process.env.OWNER_EMAIL && process.env.OWNER_PASSWORD) {
      await getPrisma().$disconnect();
    }
  });
