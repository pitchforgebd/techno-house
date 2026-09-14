/**
 * Google reCAPTCHA settings (P16-T05).
 *
 * Persists enable flag, public site key, score threshold, and page toggles.
 * Secret key stays in environment variables. Widget/verify is deferred.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  RECAPTCHA_PAGES,
  RECAPTCHA_SITE_KEY_MAX,
  normalizeRecaptchaScore,
  normalizeRecaptchaSiteKey,
  type AdminRecaptchaConfig,
  type RecaptchaPageId,
} from "@/lib/social/recaptcha-fields";

export type { AdminRecaptchaConfig } from "@/lib/social/recaptcha-fields";

export const RECAPTCHA_DB_REQUIRED =
  "reCAPTCHA changes need the database. Turn off DATA_SOURCE=mock to save.";

export type RecaptchaMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type RecaptchaActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_PAGES = Object.fromEntries(
  RECAPTCHA_PAGES.map((p) => [p.id, false]),
) as Record<RecaptchaPageId, boolean>;

const EMPTY_ADMIN: AdminRecaptchaConfig = {
  isEnabled: false,
  siteKey: "",
  scoreThreshold: 0.5,
  pages: { ...EMPTY_PAGES },
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): RecaptchaMutationResult {
  return { ok: false, formError };
}

export async function getAdminRecaptchaConfig(): Promise<AdminRecaptchaConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().recaptchaConfiguration.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  const score = normalizeRecaptchaScore(row.scoreThreshold) ?? 0.5;
  return {
    isEnabled: row.isEnabled,
    siteKey: row.siteKey ?? "",
    scoreThreshold: score,
    pages: {
      "admin-login": row.pageAdminLogin,
      "customer-login": row.pageCustomerLogin,
      "customer-registration": row.pageCustomerRegistration,
      "forgot-password": row.pageForgotPassword,
      "contact-us": row.pageContactUs,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function saveRecaptchaConfig(input: {
  isEnabled: boolean;
  siteKey: string;
  scoreThreshold: string;
  pages: Record<string, boolean>;
  actor?: RecaptchaActor;
}): Promise<RecaptchaMutationResult> {
  if (!usesDatabase()) {
    return fail(RECAPTCHA_DB_REQUIRED);
  }
  const siteKey = normalizeRecaptchaSiteKey(input.siteKey);
  if (siteKey == null) {
    return fail(
      `Site key must be ${RECAPTCHA_SITE_KEY_MAX} characters or fewer.`,
    );
  }
  const scoreThreshold = normalizeRecaptchaScore(input.scoreThreshold);
  if (scoreThreshold == null) {
    return fail("Choose a supported V3 score threshold.");
  }

  const pageAdminLogin = Boolean(input.pages["admin-login"]);
  const pageCustomerLogin = Boolean(input.pages["customer-login"]);
  const pageCustomerRegistration = Boolean(
    input.pages["customer-registration"],
  );
  const pageForgotPassword = Boolean(input.pages["forgot-password"]);
  const pageContactUs = Boolean(input.pages["contact-us"]);

  const row = await getPrisma().recaptchaConfiguration.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      isEnabled: Boolean(input.isEnabled),
      siteKey: siteKey || null,
      scoreThreshold,
      pageAdminLogin,
      pageCustomerLogin,
      pageCustomerRegistration,
      pageForgotPassword,
      pageContactUs,
    },
    update: {
      isEnabled: Boolean(input.isEnabled),
      siteKey: siteKey || null,
      scoreThreshold,
      pageAdminLogin,
      pageCustomerLogin,
      pageCustomerRegistration,
      pageForgotPassword,
      pageContactUs,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.RECAPTCHA_UPDATE,
      entityType: "RecaptchaConfiguration",
      entityId: row.id,
      metadata: {
        isEnabled: Boolean(input.isEnabled),
        scoreThreshold,
        hasSiteKey: Boolean(siteKey),
        pageAdminLogin,
        pageCustomerLogin,
        pageCustomerRegistration,
        pageForgotPassword,
        pageContactUs,
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}
