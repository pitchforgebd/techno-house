/**
 * Social identity linking suite (P0-01, P0-02, P0-03, P0-05).
 *
 *   npm run test:social
 *
 * The headline case is the pre-registration hijack:
 *
 *   1. An attacker registers on the storefront as victim@example.com and
 *      chooses a password. Registration never verifies the address, so nothing
 *      stops them.
 *   2. The real victim later clicks "Sign in with Google" with that address.
 *      Google correctly attests that THEY own it.
 *   3. The old code read that attestation as licence to link the victim's
 *      Google identity into the attacker's account — and the attacker still
 *      knew the password.
 *
 * `emailVerified` from the provider never helped: it proves the person signing
 * in owns the address, never that the pre-existing account does.
 *
 * Fixtures are created under `@techno-house.invalid` and removed in `finally`.
 */
import { config as loadEnvFiles } from "dotenv";
import { getPrisma } from "../../lib/db/prisma";
import { readFileSync } from "node:fs";
import {
  completeSocialLogin,
  SOCIAL_LINK_REQUIRES_SIGN_IN,
} from "../../lib/social/oauth-login";
import type { CompleteSocialLoginResult } from "../../lib/social/oauth-login";

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


/**
 * Calls the real function, tolerating only the final cookie write.
 *
 * The success path ends in `createCustomerSession`, which sets an httpOnly
 * cookie and therefore needs a Next request scope that a script does not have.
 * Reaching that call means every security-relevant decision — whether to link,
 * whether to create — has already been made and committed, so treating the
 * cookie error as success is accurate. Any OTHER error is a real failure and is
 * rethrown rather than swallowed.
 */
async function attempt(
  input: Parameters<typeof completeSocialLogin>[0],
): Promise<CompleteSocialLoginResult> {
  try {
    return await completeSocialLogin(input);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("outside a request scope")) {
      return { ok: true };
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const prisma = getPrisma();
  const stamp = Date.now();
  const userIds: string[] = [];

  try {
    // --- P0-01: the pre-registration hijack ---------------------------------
    // An attacker-registered account: has a password, email never verified.
    const victimEmail = `victim-${stamp}@techno-house.invalid`;
    const preRegistered = await prisma.user.create({
      data: {
        email: victimEmail,
        fullName: "Attacker Pre-registration",
        phone: `018${String(stamp).slice(-8)}`,
        passwordHash: "$argon2id$fake",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    userIds.push(preRegistered.id);

    const hijack = await attempt({
      provider: "GOOGLE",
      profile: {
        providerAccountId: `google-${stamp}`,
        email: victimEmail,
        // The provider genuinely verified it — that is the whole point.
        emailVerified: true,
        fullName: "Real Victim",
      },
    });
    check(
      "a verified provider email does NOT link into a pre-registered account",
      !hijack.ok,
      hijack.ok ? "the victim's identity was linked to the attacker" : undefined,
    );
    check(
      "the refusal tells the real owner what to do",
      !hijack.ok && hijack.formError === SOCIAL_LINK_REQUIRES_SIGN_IN,
      hijack.ok ? undefined : `got: ${hijack.formError}`,
    );
    const linkedAfterHijack = await prisma.socialLoginAccount.count({
      where: { userId: preRegistered.id },
    });
    check(
      "no provider identity was attached to the pre-registered account",
      linkedAfterHijack === 0,
      `linked=${linkedAfterHijack}`,
    );

    // --- P0-02: the same protection regardless of provider ------------------
    // Facebook exposes no verification claim, so the adapter infers one from
    // the presence of an email. That inference must not be able to link either.
    const fbHijack = await attempt({
      provider: "FACEBOOK",
      profile: {
        providerAccountId: `fb-${stamp}`,
        email: victimEmail,
        emailVerified: true,
        fullName: "Real Victim",
      },
    });
    check(
      "a Facebook identity cannot link into a pre-registered account either",
      !fbHijack.ok,
      fbHijack.ok ? "linked via the inferred verification claim" : undefined,
    );

    // --- The legitimate paths must still work -------------------------------
    // A brand-new social sign-up: no existing account, so nothing to hijack.
    const freshEmail = `fresh-${stamp}@techno-house.invalid`;
    const fresh = await attempt({
      provider: "GOOGLE",
      profile: {
        providerAccountId: `google-fresh-${stamp}`,
        email: freshEmail,
        emailVerified: true,
        fullName: "Fresh Social User",
      },
    });
    check(
      "a brand-new social sign-in creates an account",
      fresh.ok,
      fresh.ok ? undefined : fresh.formError,
    );
    const freshUser = await prisma.user.findUnique({
      where: { email: freshEmail },
      select: { id: true, passwordHash: true, emailVerifiedAt: true },
    });
    if (freshUser) {
      userIds.push(freshUser.id);
    }
    check(
      "the social-created account has no password",
      freshUser?.passwordHash === null,
    );
    // P0-05: nothing in the codebase ever set this field before.
    check(
      "a provider-verified email marks the account verified",
      freshUser?.emailVerifiedAt instanceof Date,
      `emailVerifiedAt=${freshUser?.emailVerifiedAt}`,
    );

    // A SECOND provider linking into that social-only account is safe: there is
    // no password-holder to impersonate, so no pre-registration to hijack.
    const secondProvider = await attempt({
      provider: "FACEBOOK",
      profile: {
        providerAccountId: `fb-fresh-${stamp}`,
        email: freshEmail,
        emailVerified: true,
        fullName: "Fresh Social User",
      },
    });
    check(
      "a second provider links into a password-less social account",
      secondProvider.ok,
      secondProvider.ok ? undefined : secondProvider.formError,
    );

    // Returning with an already-linked identity signs in, unchanged.
    const returning = await attempt({
      provider: "GOOGLE",
      profile: {
        providerAccountId: `google-fresh-${stamp}`,
        email: freshEmail,
        emailVerified: true,
        fullName: "Fresh Social User",
      },
    });
    check(
      "an already-linked identity still signs in",
      returning.ok,
      returning.ok ? undefined : returning.formError,
    );

    // --- P0-03: a social-only account is a valid credential -----------------
    // A live session cannot be created from a script (it needs a request scope
    // for the cookie), so assert the condition the session resolver now uses:
    // no password, but a linked provider identity.
    if (freshUser) {
      const linked = await prisma.socialLoginAccount.count({
        where: { userId: freshUser.id },
      });
      check(
        "the social-only account has a linked identity to authenticate with",
        freshUser.passwordHash === null && linked > 0,
        `passwordHash=${freshUser.passwordHash} linked=${linked}`,
      );
      const sessionSrc = readFileSync("lib/auth/customer-session.ts", "utf-8");
      check(
        "the session resolver accepts a linked identity as a credential",
        /socialLoginAccounts[\s\S]{0,600}hasCredential/.test(sessionSrc),
        "a password-less social account would still be revoked on sight",
      );
    }

    // An unverified provider email still cannot create anything.
    const unverified = await attempt({
      provider: "GOOGLE",
      profile: {
        providerAccountId: `google-unv-${stamp}`,
        email: `unverified-${stamp}@techno-house.invalid`,
        emailVerified: false,
        fullName: "Unverified",
      },
    });
    check("an unverified provider email is refused", !unverified.ok);
  } finally {
    await prisma.socialLoginAccount.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.customerSession.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  }

  if (failures > 0) {
    console.error(`social linking failed (${failures}/${checks})`);
    process.exitCode = 1;
    return;
  }
  console.log(`ok ${checks} social linking checks`);
}

main().catch((error) => {
  console.error("social linking suite crashed:", error);
  process.exitCode = 1;
});
