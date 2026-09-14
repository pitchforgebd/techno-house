/**
 * Completes a verified OAuth profile into a real customer session —
 * shared by every provider callback (Phase 9).
 */
import { getPrisma } from "@/lib/db/prisma";
import { createCustomerSession } from "@/lib/auth/customer-session";
import { mergeGuestCartFromCookie } from "@/lib/cart/persist";
import { normalizeEmail, normalizeFullName } from "@/lib/account/validation";
import type { OAuthProviderId } from "@/lib/social/oauth-config";
import type { OAuthProfile } from "@/lib/social/oauth-providers";
import type { SocialLoginProvider as DbProvider } from "@/lib/generated/prisma/enums";

/**
 * Shown when a provider identity matches an existing account by email but
 * cannot prove it owns it. Deliberately actionable: the real owner can sign
 * in with their password and repeat the social sign-in, which links it.
 */
export const SOCIAL_LINK_REQUIRES_SIGN_IN =
  "An account already uses this email. Sign in with your password first, then use this button again to link it.";

export type CompleteSocialLoginResult =
  | { ok: true }
  | { ok: false; formError: string };

export async function completeSocialLogin(input: {
  provider: OAuthProviderId;
  profile: OAuthProfile;
  ip?: string | null;
  userAgent?: string | null;
  /**
   * The customer already signed in in this browser, if any. Passed in by the
   * callback route rather than read from cookies here: this function would
   * otherwise depend on ambient request state, which makes it untestable
   * outside a request and hides the dependency from callers.
   */
  currentUserId?: string | null;
}): Promise<CompleteSocialLoginResult> {
  const prisma = getPrisma();
  const provider = input.provider as DbProvider;

  const linked = await prisma.socialLoginAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: input.profile.providerAccountId,
      },
    },
    select: { userId: true },
  });

  let userId: string;

  if (linked) {
    userId = linked.userId;
  } else {
    // First time this provider identity has signed in — only trust it
    // enough to link/create an account if the provider actually verified
    // the email. Otherwise a stranger could claim someone else's email.
    if (!input.profile.email || !input.profile.emailVerified) {
      return {
        ok: false,
        formError: "Your email could not be verified with this provider.",
      };
    }
    const email = normalizeEmail(input.profile.email);
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, status: true, passwordHash: true },
    });

    if (existingUser) {
      if (existingUser.status !== "ACTIVE") {
        return {
          ok: false,
          formError: "This account is not available. Contact support if you need help.",
        };
      }

      // Matching on email alone is NOT proof that this provider identity owns
      // the account (P0-01).
      //
      // Registration never verifies the email address, so anyone could sign up
      // as victim@example.com. When the real owner later signed in with
      // Google, the provider correctly attested that *they* own the address —
      // and this code took that as licence to link their identity into the
      // attacker's pre-registered account. The attacker kept the password, and
      // the victim then filled that account with their real name, phone,
      // addresses and order history. That is the classic-federated-merge
      // variant of a pre-hijacking attack.
      //
      // `emailVerified` from the provider does not help: it proves the person
      // signing in owns the address, never that the pre-existing account does.
      // It also cannot be trusted uniformly — Facebook exposes no verification
      // claim at all (P0-02).
      //
      // So linking now requires actual proof of control of the existing
      // account, by one of two routes:
      const provesControl =
        // (a) they are already signed in to that very account, so they have
        //     demonstrated control of it in this session; or
        (input.currentUserId != null &&
          input.currentUserId === existingUser.id) ||
        // (b) the account has no password at all, which means it was itself
        //     created by a social sign-in. There is no password-holder to
        //     impersonate, so no pre-registration to hijack.
        existingUser.passwordHash === null;

      if (!provesControl) {
        return { ok: false, formError: SOCIAL_LINK_REQUIRES_SIGN_IN };
      }
      userId = existingUser.id;
    } else {
      const created = await prisma.user.create({
        data: {
          email,
          fullName: normalizeFullName(input.profile.fullName) || "Customer",
          passwordHash: null,
          status: "ACTIVE",
          // The provider attested this address and we created the account from
          // it, so it is genuinely verified. Nothing else in the codebase ever
          // set this field (P0-05), which is why the admin's "Verified" filter
          // was always empty.
          emailVerifiedAt: new Date(),
        },
        select: { id: true },
      });
      userId = created.id;
    }

    await prisma.socialLoginAccount.create({
      data: {
        provider,
        providerAccountId: input.profile.providerAccountId,
        userId,
      },
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  if (!user || user.status !== "ACTIVE") {
    return {
      ok: false,
      formError: "This account is not available. Contact support if you need help.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
  await createCustomerSession({
    userId,
    ip: input.ip,
    userAgent: input.userAgent,
  });
  try {
    await mergeGuestCartFromCookie(userId);
  } catch {
    // Login still succeeds if cart merge cannot run.
  }

  return { ok: true };
}
