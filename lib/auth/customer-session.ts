/**
 * Customer session resolution (P11-T01 / P11-T03).
 *
 * Presentation code gets `CustomerSessionView` only — never the token, hash,
 * or password fields.
 */
import { redirect } from "next/navigation";
import { cache } from "react";
import {
  clearCustomerSessionCookie,
  CUSTOMER_SESSION_TTL_MS,
  readCustomerSessionCookie,
  setCustomerSessionCookie,
} from "@/lib/auth/customer-session-cookie";
import {
  pruneCustomerSessions,
  revokeAllCustomerSessions,
  shouldTouchLastUsed,
  touchCustomerSessionLastUsed,
} from "@/lib/auth/session-policy";
import {
  createSessionToken,
  hashIp,
  hashSessionToken,
  isWellFormedSessionToken,
} from "@/lib/auth/session-token";
import { getPrisma } from "@/lib/db/prisma";

export type CustomerSessionView = {
  userId: string;
  email: string;
  fullName: string;
  phone: string;
};

type CreateSessionInput = {
  userId: string;
  ip?: string | null;
  userAgent?: string | null;
};

export async function createCustomerSession(
  input: CreateSessionInput,
): Promise<void> {
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CUSTOMER_SESSION_TTL_MS);
  const agent = input.userAgent?.trim().slice(0, 512) || null;

  await getPrisma().customerSession.create({
    data: {
      userId: input.userId,
      tokenHash,
      expiresAt,
      lastUsedAt: now,
      ipHash: hashIp(input.ip),
      userAgent: agent,
    },
  });

  await pruneCustomerSessions(input.userId);
  await setCustomerSessionCookie(token, expiresAt);
}

/**
 * Resolve the signed-in customer for this request, or null.
 * Cached per React request so layout + page share one lookup.
 */
export const getCustomerSession = cache(
  async (): Promise<CustomerSessionView | null> => {
    const token = await readCustomerSessionCookie();
    if (!token || !isWellFormedSessionToken(token)) {
      if (token) {
        await clearCustomerSessionCookie();
      }
      return null;
    }

    const tokenHash = hashSessionToken(token);
    const now = new Date();
    const row = await getPrisma().customerSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        expiresAt: true,
        revokedAt: true,
        lastUsedAt: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            status: true,
            passwordHash: true,
            // A social-only account legitimately has no password — see below.
            socialLoginAccounts: { select: { id: true }, take: 1 },
          },
        },
      },
    });

    if (!row || row.revokedAt || row.expiresAt <= now) {
      await clearCustomerSessionCookie();
      return null;
    }

    // A null password hash means "this account cannot be signed in to" — an
    // account that was never finished provisioning. It does NOT mean a social
    // account, which legitimately has no password (P0-03).
    //
    // Before this distinction existed, OAuth sign-up was broken end to end:
    // the callback created the user with `passwordHash: null`, issued a
    // session, and then the very next request revoked every session that
    // account had. The fix is to recognise a linked provider identity as a
    // valid credential rather than to drop the check, which would also have
    // let genuinely unprovisioned accounts through.
    const hasCredential =
      Boolean(row.user.passwordHash) || row.user.socialLoginAccounts.length > 0;
    if (row.user.status !== "ACTIVE" || !hasCredential) {
      await revokeAllCustomerSessions(row.user.id);
      await clearCustomerSessionCookie();
      return null;
    }

    if (shouldTouchLastUsed(row.lastUsedAt, now)) {
      await touchCustomerSessionLastUsed(row.id);
    }

    return {
      userId: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      phone: row.user.phone ?? "",
    };
  },
);

/** Redirect target helper for protected account routes. */
export async function requireCustomerSession(): Promise<CustomerSessionView> {
  const session = await getCustomerSession();
  if (!session) {
    redirect("/account/login");
  }
  return session;
}

export async function revokeCurrentCustomerSession(): Promise<void> {
  const token = await readCustomerSessionCookie();
  if (token && isWellFormedSessionToken(token)) {
    await revokeCustomerSessionByHash(hashSessionToken(token));
  }
  await clearCustomerSessionCookie();
}

async function revokeCustomerSessionByHash(tokenHash: string): Promise<void> {
  await getPrisma().customerSession.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
