/**
 * Staff session DB resolution, factored out of `staff-session.ts` so
 * `middleware.ts` can call the exact same fresh-permissions lookup that
 * `getStaffSession()` uses in Server Components — no `next/headers`
 * dependency here, so this is safe to import from middleware (Node.js
 * runtime; see `middleware.ts`).
 *
 * Every admin permission gate ultimately calls this, directly or via
 * `getStaffSession()` — one query, one source of truth for "is this token
 * still a live, active-staff session, and what can it do right now."
 */
import {
  shouldTouchLastUsed,
  touchStaffSessionLastUsed,
} from "@/lib/auth/session-policy";
import { hashSessionToken } from "@/lib/auth/session-token";
import { getPrisma } from "@/lib/db/prisma";

export type StaffSessionView = {
  staffId: string;
  email: string;
  fullName: string;
  roleKey: string | null;
  roleName: string;
  /** Granted permission keys (e.g. `product.view`). Never includes tokens. */
  permissions: string[];
};

/**
 * Resolves a raw (already JWT-unwrapped) opaque session token to the live
 * staff session, or `null` if it does not correspond to a valid, active
 * session — expired, revoked, or the staff account itself is gone/locked.
 * Always a fresh DB read: permissions are deliberately never cached in the
 * token (see `session-jwt.ts`), so a revoked permission or role change
 * takes effect on the very next request.
 */
export async function resolveStaffSessionByToken(
  token: string,
): Promise<StaffSessionView | null> {
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const row = await getPrisma().staffSession.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      lastUsedAt: true,
      staff: {
        select: {
          id: true,
          email: true,
          fullName: true,
          status: true,
          passwordHash: true,
          role: {
            select: {
              key: true,
              name: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!row || row.revokedAt || row.expiresAt <= now) {
    return null;
  }

  if (row.staff.status !== "ACTIVE" || !row.staff.passwordHash) {
    return null;
  }

  if (shouldTouchLastUsed(row.lastUsedAt, now)) {
    // Fire and forget: a slow write here must not delay the response, and
    // losing an occasional touch is harmless (it's a UX timestamp, not a
    // security field).
    void touchStaffSessionLastUsed(row.id).catch(() => {});
  }

  return {
    staffId: row.staff.id,
    email: row.staff.email,
    fullName: row.staff.fullName,
    roleKey: row.staff.role?.key ?? null,
    roleName: row.staff.role?.name ?? "Unassigned",
    permissions:
      row.staff.role?.permissions.map((grant) => grant.permission.key) ?? [],
  };
}
