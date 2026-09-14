-- Grant audit.view to the Admin system role (P11-T05).
-- The catalogue is also upserted by the seed; this migration makes the page
-- reachable without a re-seed.

INSERT INTO "Permission" ("id", "key", "groupKey", "label", "createdAt")
VALUES (
  'perm_audit_view',
  'audit.view',
  'staff_roles',
  'View audit log',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId", "grantedAt")
SELECT r."id", p."id", CURRENT_TIMESTAMP
FROM "Role" r
INNER JOIN "Permission" p ON p."key" = 'audit.view'
WHERE r."key" = 'role-admin'
ON CONFLICT ("roleId", "permissionId") DO NOTHING;
