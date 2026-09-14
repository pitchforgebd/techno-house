/**
 * OTP/SMS gateway settings (P16-T03).
 *
 * Persists provider, sender id, code length, expiry, and feature flags.
 * API keys and secrets stay in environment variables — never the database.
 * Test-send lives in lib/sms/send.ts (used by Admin → OTP "Send test OTP",
 * AD-240); the login/registration OTP generate/verify flow is still deferred.
 * `DATA_SOURCE=mock` refuses writes.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  DEFAULT_EXPIRY_MINUTES,
  DEFAULT_OTP_LENGTH,
  DEFAULT_OTP_PROVIDER,
  EXPIRY_MINUTES_MAX,
  EXPIRY_MINUTES_MIN,
  SENDER_ID_MAX,
  normalizeExpiryMinutes,
  normalizeOtpLength,
  normalizeOtpProvider,
  normalizeSenderId,
  type AdminOtpConfig,
  type OtpProviderId,
} from "@/lib/otp/fields";

export type { AdminOtpConfig } from "@/lib/otp/fields";

export const OTP_DB_REQUIRED =
  "OTP / SMS changes need the database. Turn off DATA_SOURCE=mock to save.";

export type OtpMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type OtpActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_ADMIN: AdminOtpConfig = {
  provider: DEFAULT_OTP_PROVIDER,
  senderId: "",
  otpLength: DEFAULT_OTP_LENGTH,
  expiryMinutes: DEFAULT_EXPIRY_MINUTES,
  otpLogin: false,
  otpRegistration: false,
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): OtpMutationResult {
  return { ok: false, formError };
}

function toAdminConfig(row: {
  provider: string;
  senderId: string | null;
  otpLength: number;
  expiryMinutes: number;
  otpLogin: boolean;
  otpRegistration: boolean;
  updatedAt: Date;
}): AdminOtpConfig {
  const provider = normalizeOtpProvider(row.provider) ?? DEFAULT_OTP_PROVIDER;
  const otpLength = normalizeOtpLength(row.otpLength) ?? DEFAULT_OTP_LENGTH;
  const expiryMinutes =
    normalizeExpiryMinutes(row.expiryMinutes) ?? DEFAULT_EXPIRY_MINUTES;
  return {
    provider,
    senderId: row.senderId ?? "",
    otpLength,
    expiryMinutes,
    otpLogin: row.otpLogin,
    otpRegistration: row.otpRegistration,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminOtpConfig(): Promise<AdminOtpConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().otpSmsConfiguration.findUnique({
    where: { id: "singleton" },
    select: {
      provider: true,
      senderId: true,
      otpLength: true,
      expiryMinutes: true,
      otpLogin: true,
      otpRegistration: true,
      updatedAt: true,
    },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  return toAdminConfig(row);
}

/** Feature flags for a future OTP auth flow. Does not send SMS. */
export async function getOtpFeatureFlags(): Promise<{
  provider: OtpProviderId;
  otpLogin: boolean;
  otpRegistration: boolean;
  otpLength: number;
  expiryMinutes: number;
}> {
  const config = await getAdminOtpConfig();
  return {
    provider: config.provider,
    otpLogin: config.otpLogin,
    otpRegistration: config.otpRegistration,
    otpLength: config.otpLength,
    expiryMinutes: config.expiryMinutes,
  };
}

export async function saveOtpSmsConfig(input: {
  provider: string;
  senderId: string;
  otpLength: string;
  expiryMinutes: string;
  otpLogin: boolean;
  otpRegistration: boolean;
  actor?: OtpActor;
}): Promise<OtpMutationResult> {
  if (!usesDatabase()) {
    return fail(OTP_DB_REQUIRED);
  }

  const provider = normalizeOtpProvider(input.provider);
  if (provider == null) {
    return fail("Choose a supported SMS provider.");
  }
  const senderId = normalizeSenderId(input.senderId);
  if (senderId == null) {
    return fail(`Sender ID must be ${SENDER_ID_MAX} characters or fewer.`);
  }
  const otpLength = normalizeOtpLength(input.otpLength);
  if (otpLength == null) {
    return fail("OTP length must be 4 or 6 digits.");
  }
  const expiryMinutes = normalizeExpiryMinutes(input.expiryMinutes);
  if (expiryMinutes == null) {
    return fail(
      `OTP expiry must be between ${EXPIRY_MINUTES_MIN} and ${EXPIRY_MINUTES_MAX} minutes.`,
    );
  }

  const row = await getPrisma().otpSmsConfiguration.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      provider,
      senderId: senderId || null,
      otpLength,
      expiryMinutes,
      otpLogin: Boolean(input.otpLogin),
      otpRegistration: Boolean(input.otpRegistration),
    },
    update: {
      provider,
      senderId: senderId || null,
      otpLength,
      expiryMinutes,
      otpLogin: Boolean(input.otpLogin),
      otpRegistration: Boolean(input.otpRegistration),
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.OTP_SMS_UPDATE,
      entityType: "OtpSmsConfiguration",
      entityId: row.id,
      metadata: {
        provider,
        otpLength,
        expiryMinutes,
        otpLogin: Boolean(input.otpLogin),
        otpRegistration: Boolean(input.otpRegistration),
        hasSenderId: Boolean(senderId),
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

/**
 * Customers who would sign in WITHOUT an OTP even when `otpLogin` is on.
 *
 * `loginCustomer` gates the challenge on `otpConfig.otpLogin && user.phone`,
 * because a phone-less account has nowhere to send a code. That is the only
 * sensible behaviour at the point of sign-in — but it means enabling the
 * policy does not actually make it universal, and nothing surfaced the gap
 * (P0-04). An operator switching OTP on reasonably assumes it covers everyone.
 *
 * Counting them lets the settings screen say plainly how many accounts the
 * policy will not apply to.
 */
export async function countOtpExemptCustomers(): Promise<number> {
  if (!usesDatabase()) {
    return 0;
  }
  return getPrisma().user.count({
    where: {
      status: "ACTIVE",
      OR: [{ phone: null }, { phone: "" }],
    },
  });
}
