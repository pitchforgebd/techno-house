/**
 * Privilege containment suite (DSA-03).
 *
 *   npm run test:privilege
 *
 * Every case here was a real escalation path before the containment rules
 * landed. Holding `staff.add`, `staff.edit` or `roles.manage` each amounted to
 * full Admin, because authorization checked whether you could perform the
 * operation but never how much privilege the operation handed out.
 *
 * The suite also proves containment is invisible to a real Admin: the last two
 * cases assert that legitimate administration still works.
 *
 * Creates its own `@techno-house.invalid` fixtures and removes them in
 * `finally`, like the other suites here. It never modifies seeded roles.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import { saveStaff } from "../../lib/admin/save-staff";
import { saveStaffRole } from "../../lib/auth/staff-roles";

loadEnvFiles({ path: [".env.local", ".env"], quiet: true });

let checks = 0;
let failures = 0;

function check(name: string, condition: unknown, detail?: string): void {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`fail ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();

  const adminRole = await prisma.role.findUnique({
    where: { key: "role-admin" },
    select: { id: true, key: true, isSystem: true },
  });
  const allPermissions = await prisma.permission.findMany({
    select: { key: true },
  });
  if (!adminRole || allPermissions.length === 0) {
    console.error("fail fixtures — seed the roles and permissions first.");
    process.exitCode = 1;
    return;
  }

  const createdRoleKeys: string[] = [];
  const createdStaffIds: string[] = [];

  // This suite exercises guards that, when broken, mutate SHARED SEED STATE —
  // the Admin role's grants and the real administrator's own role. That is not
  // hypothetical: running it against unguarded code stripped the Admin role to
  // a single permission and left the only administrator with no role at all.
  // So snapshot both up front and restore them unconditionally in `finally`,
  // whether the guards held or not.
  const adminPermissionIds = (
    await prisma.rolePermission.findMany({
      where: { roleId: adminRole.id },
      select: { permissionId: true },
    })
  ).map((row) => row.permissionId);
  const adminStaffSnapshot = await prisma.staff.findMany({
    where: { roleId: adminRole.id },
    select: { id: true, roleId: true, status: true },
  });

  try {
    // A deliberately weak role: it can manage staff and roles, and nothing
    // else. This is exactly the shape an operator would create for an office
    // manager, and exactly the shape that used to be full Admin.
    const weakRole = await prisma.role.create({
      data: {
        key: `role-weak-${stamp}`,
        name: `Weak ${stamp}`,
        isSystem: false,
        permissions: {
          create: (
            await prisma.permission.findMany({
              where: { key: { in: ["staff.add", "staff.edit", "roles.manage"] } },
              select: { id: true },
            })
          ).map((p) => ({ permissionId: p.id })),
        },
      },
      select: { id: true, key: true },
    });
    createdRoleKeys.push(weakRole.key);

    const weakStaff = await prisma.staff.create({
      data: {
        fullName: "Weak Actor",
        email: `weak-${stamp}@techno-house.invalid`,
        phone: `019${String(stamp).slice(-8)}`,
        roleId: weakRole.id,
        status: "ACTIVE",
        passwordHash: "x",
      },
      select: { id: true, email: true },
    });
    createdStaffIds.push(weakStaff.id);

    const weakActor = { staffId: weakStaff.id, email: weakStaff.email };

    // --- Vector A: staff.add -> create an Admin ----------------------------
    const mintAdmin = await saveStaff({
      fullName: "Minted Admin",
      email: `minted-${stamp}@techno-house.invalid`,
      phone: `018${String(stamp).slice(-8)}`,
      roleKey: adminRole.key,
      status: "active",
      password: "Str0ng-Passw0rd!",
      actor: weakActor,
    });
    check(
      "staff.add cannot create an account with a role above the actor",
      !mintAdmin.ok,
      mintAdmin.ok ? "an Admin account was created" : undefined,
    );
    if (mintAdmin.ok) {
      createdStaffIds.push(mintAdmin.id);
    }

    // --- Vector B: staff.edit -> promote self ------------------------------
    const selfPromote = await saveStaff({
      id: weakStaff.id,
      fullName: "Weak Actor",
      email: weakStaff.email,
      phone: `019${String(stamp).slice(-8)}`,
      roleKey: adminRole.key,
      status: "active",
      actor: weakActor,
    });
    check(
      "staff.edit cannot promote the actor's own account",
      !selfPromote.ok,
      selfPromote.ok ? "self-promotion to Admin succeeded" : undefined,
    );

    // Promoting somebody *else* above yourself is the same escalation.
    const victim = await prisma.staff.create({
      data: {
        fullName: "Other Staff",
        email: `other-${stamp}@techno-house.invalid`,
        phone: `016${String(stamp).slice(-8)}`,
        roleId: weakRole.id,
        status: "ACTIVE",
        passwordHash: "x",
      },
      select: { id: true, email: true },
    });
    createdStaffIds.push(victim.id);
    const promoteOther = await saveStaff({
      id: victim.id,
      fullName: "Other Staff",
      email: victim.email,
      phone: `016${String(stamp).slice(-8)}`,
      roleKey: adminRole.key,
      status: "active",
      actor: weakActor,
    });
    check(
      "staff.edit cannot promote another account above the actor",
      !promoteOther.ok,
      promoteOther.ok ? "another account was promoted to Admin" : undefined,
    );

    // --- Vector C: roles.manage -> grant yourself everything ---------------
    const grantAll = await saveStaffRole({
      key: weakRole.key,
      name: `Weak ${stamp}`,
      permissionIds: allPermissions.map((p) => p.key),
      actor: weakActor,
    });
    check(
      "roles.manage cannot grant permissions the actor does not hold",
      !grantAll.ok,
      grantAll.ok ? "the actor granted its own role every permission" : undefined,
    );

    const weakAfter = await prisma.role.findUnique({
      where: { key: weakRole.key },
      select: { _count: { select: { permissions: true } } },
    });
    check(
      "the actor's own role was not widened",
      weakAfter?._count.permissions === 3,
      `permissions=${weakAfter?._count.permissions}`,
    );

    // --- Vector C2: roles.manage -> edit the system Admin role -------------
    const editAdminRole = await saveStaffRole({
      key: adminRole.key,
      name: "Admin",
      permissionIds: ["staff.view"],
      actor: weakActor,
    });
    check(
      "the built-in Admin role cannot be edited",
      !editAdminRole.ok,
      editAdminRole.ok ? "the Admin role was modified" : undefined,
    );
    const adminAfter = await prisma.role.findUnique({
      where: { key: adminRole.key },
      select: { _count: { select: { permissions: true } } },
    });
    check(
      "the Admin role still holds every permission",
      adminAfter?._count.permissions === allPermissions.length,
      `permissions=${adminAfter?._count.permissions} of ${allPermissions.length}`,
    );

    // --- Legitimate administration must still work -------------------------
    // A grant strictly within the actor's own access is allowed.
    const containedGrant = await saveStaffRole({
      key: weakRole.key,
      name: `Weak ${stamp}`,
      permissionIds: ["staff.add", "staff.edit"],
      actor: weakActor,
    });
    check(
      "a grant within the actor's own access is allowed",
      containedGrant.ok,
      containedGrant.ok ? undefined : containedGrant.formError,
    );

    // A real Admin is unaffected by containment.
    const realAdmin = await prisma.staff.findFirst({
      where: { roleId: adminRole.id, status: "ACTIVE" },
      select: { id: true, email: true },
    });
    if (realAdmin) {
      const adminCreates = await saveStaff({
        fullName: "Admin Created",
        email: `admincreated-${stamp}@techno-house.invalid`,
        phone: `015${String(stamp).slice(-8)}`,
        roleKey: weakRole.key,
        status: "active",
        password: "Str0ng-Passw0rd!",
        actor: { staffId: realAdmin.id, email: realAdmin.email },
      });
      check(
        "a real Admin can still create staff (containment is invisible to them)",
        adminCreates.ok,
        adminCreates.ok ? undefined : adminCreates.formError,
      );
      if (adminCreates.ok) {
        createdStaffIds.push(adminCreates.id);
      }

      // --- Last-admin protection -----------------------------------------
      const demoteLastAdmin = await saveStaff({
        id: realAdmin.id,
        fullName: "Admin",
        email: realAdmin.email,
        phone: `014${String(stamp).slice(-8)}`,
        roleKey: weakRole.key,
        status: "active",
        actor: { staffId: realAdmin.id, email: realAdmin.email },
      });
      check(
        "the last administrator cannot be demoted",
        !demoteLastAdmin.ok,
        demoteLastAdmin.ok
          ? "the only Admin was demoted, stranding the panel"
          : undefined,
      );
      const adminStill = await prisma.staff.findUnique({
        where: { id: realAdmin.id },
        select: { roleId: true, status: true },
      });
      check(
        "the last administrator kept their role",
        adminStill?.roleId === adminRole.id && adminStill?.status === "ACTIVE",
        `roleId match=${adminStill?.roleId === adminRole.id} status=${adminStill?.status}`,
      );
    }
  } finally {
    // Restore shared seed state first — fixture deletion below sets the role
    // of anyone still attached to a fixture role to NULL.
    await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
    await prisma.rolePermission.createMany({
      data: adminPermissionIds.map((permissionId) => ({
        roleId: adminRole.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
    for (const snapshot of adminStaffSnapshot) {
      await prisma.staff.update({
        where: { id: snapshot.id },
        data: { roleId: snapshot.roleId, status: snapshot.status },
      });
    }

    await prisma.staff.deleteMany({ where: { id: { in: createdStaffIds } } });
    await prisma.rolePermission.deleteMany({
      where: { role: { key: { in: createdRoleKeys } } },
    });
    await prisma.role.deleteMany({ where: { key: { in: createdRoleKeys } } });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`privilege containment failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} privilege containment checks`);
}

main().catch((error) => {
  console.error("privilege containment crashed:", error);
  process.exitCode = 1;
});
