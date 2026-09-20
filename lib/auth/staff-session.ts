/**
 * Staff session resolution (P11-T02 / P11-T03).
 *
 * Presentation code gets `StaffSessionView` only — never the token, hash,
 * or password fields. Permission keys come from the staff member's role.
 */
import { redirect } from "next/navigation";
import { cache } from "react";
import { adminLoginPath } from "@/lib/auth/admin-login-path";
import {
  pruneStaffSessions,
  revokeAllStaffSessions,
  shouldTouchLastUsed,
  touchStaffSessionLastUsed,
} from "@/lib/auth/session-policy";
import {
  createSessionToken,
  hashIp,
  hashSessionToken,
  isWellFormedSessionToken,
} from "@/lib/auth/session-token";
import {
  clearStaffSessionCookie,
  readStaffSessionCookie,
  setStaffSessionCookie,
  STAFF_SESSION_TTL_MS,
} from "@/lib/auth/staff-session-cookie";
import { getPrisma } from "@/lib/db/prisma";

// Re-exported so existing importers of `staff-session.ts` are unaffected.
// `staff-session-core.ts` holds the canonical shape (and the middleware-safe
// resolver, `resolveStaffSessionByToken`) since it has no `next/headers`
// dependency and can be imported from `middleware.ts`.
export type { StaffSessionView } from "@/lib/auth/staff-session-core";
import type { StaffSessionView } from "@/lib/auth/staff-session-core";

type CreateSessionInput = {
  staffId: string;
  ip?: string | null;
  userAgent?: string | null;
};

export async function createStaffSession(
  input: CreateSessionInput,
): Promise<void> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STAFF_SESSION_TTL_MS);
  const agent = input.userAgent?.trim().slice(0, 512) || null;

  await getPrisma().staffSession.create({
    data: {
      staffId: input.staffId,
      tokenHash,
      expiresAt,
      lastUsedAt: now,
      ipHash: hashIp(input.ip),
      userAgent: agent,
    },
  });

  await pruneStaffSessions(input.staffId);
  await setStaffSessionCookie(token, expiresAt);
}

/**
 * Resolve the signed-in staff member for this request, or null.
 * Cached per React request so layout + page share one lookup.
 */
export const getStaffSession = cache(
  async (): Promise<StaffSessionView | null> => {
    const token = await readStaffSessionCookie();
    if (!token || !isWellFormedSessionToken(token)) {
      if (token) {
        await clearStaffSessionCookie();
      }
      return null;
    }

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
      await clearStaffSessionCookie();
      return null;
    }

    if (row.staff.status !== "ACTIVE" || !row.staff.passwordHash) {
      await revokeAllStaffSessions(row.staff.id);
      await clearStaffSessionCookie();
      return null;
    }

    if (shouldTouchLastUsed(row.lastUsedAt, now)) {
      await touchStaffSessionLastUsed(row.id);
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
  },
);

export async function requireStaffSession(): Promise<StaffSessionView> {
  const session = await getStaffSession();
  if (!session) {
    redirect(adminLoginPath());
  }
  return session;
}

export async function revokeCurrentStaffSession(): Promise<void> {
  const token = await readStaffSessionCookie();
  if (token && isWellFormedSessionToken(token)) {
    await revokeStaffSessionByHash(hashSessionToken(token));
  }
  await clearStaffSessionCookie();
}

async function revokeStaffSessionByHash(tokenHash: string): Promise<void> {
  await getPrisma().staffSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
