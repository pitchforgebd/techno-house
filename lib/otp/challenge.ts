/**
 * Real OTP 2FA challenge lifecycle (Phase 9).
 *
 * The actual code is never returned to the client, logged, or included in
 * any response — only sent via `sendSms()`. Both the challenge token and
 * the code are stored hashed (sha256), matching how session tokens are
 * stored (lib/auth/session-token.ts). A challenge is single-use: verifying
 * it correctly — or letting it expire / exhaust its attempt limit —
 * permanently invalidates it.
 */
import { randomInt, createHash } from "node:crypto";
import { getPrisma } from "@/lib/db/prisma";
import { getAdminOtpConfig } from "@/lib/otp/config";
import { sendSms } from "@/lib/sms/send";
import { limitOtpSend } from "@/lib/auth/rate-limit";
import {
  createSessionToken,
  hashSessionToken,
} from "@/lib/auth/session-token";
import type { OtpChallengePurpose } from "@/lib/generated/prisma/enums";

export type CreateOtpChallengeResult =
  | { ok: true; token: string; phoneHint: string }
  | { ok: false; formError: string };

export type VerifyOtpChallengeResult =
  | {
      ok: true;
      purpose: OtpChallengePurpose;
      userId: string | null;
      pendingFullName: string | null;
      pendingEmail: string | null;
      pendingPhone: string | null;
      pendingPasswordHash: string | null;
    }
  | { ok: false; formError: string };

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(length: number): string {
  const max = 10 ** length;
  const value = randomInt(0, max);
  return String(value).padStart(length, "0");
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) {
    return `***${digits}`;
  }
  return `${digits.slice(0, -4).replace(/./g, "*")}${digits.slice(-4)}`;
}

async function invalidateExistingChallenges(
  phone: string,
  purpose: OtpChallengePurpose,
): Promise<void> {
  await getPrisma().otpChallenge.updateMany({
    where: { phone, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}

async function issueChallenge(input: {
  purpose: OtpChallengePurpose;
  phone: string;
  ip?: string | null;
  userId?: string;
  pendingFullName?: string;
  pendingEmail?: string;
  pendingPhone?: string;
  pendingPasswordHash?: string;
}): Promise<CreateOtpChallengeResult> {
  const limited = await limitOtpSend(input.phone, input.ip);
  if (!limited.ok) {
    return { ok: false, formError: limited.formError };
  }

  const config = await getAdminOtpConfig();
  const code = generateCode(config.otpLength);
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + config.expiryMinutes * 60 * 1000);

  await invalidateExistingChallenges(input.phone, input.purpose);

  const row = await getPrisma().otpChallenge.create({
    data: {
      purpose: input.purpose,
      phone: input.phone,
      tokenHash: hashSessionToken(token),
      codeHash: hashCode(code),
      expiresAt,
      userId: input.userId,
      pendingFullName: input.pendingFullName,
      pendingEmail: input.pendingEmail,
      pendingPhone: input.pendingPhone,
      pendingPasswordHash: input.pendingPasswordHash,
    },
    select: { id: true },
  });

  const sent = await sendSms({
    to: input.phone,
    message: `Your Techno House verification code is ${code}. It expires in ${config.expiryMinutes} minute${config.expiryMinutes === 1 ? "" : "s"}.`,
  });
  if (!sent.ok) {
    await getPrisma().otpChallenge.delete({ where: { id: row.id } }).catch(() => {});
    return { ok: false, formError: sent.formError };
  }

  return { ok: true, token, phoneHint: maskPhone(input.phone) };
}

export async function createLoginOtpChallenge(input: {
  userId: string;
  phone: string;
  ip?: string | null;
}): Promise<CreateOtpChallengeResult> {
  return issueChallenge({
    purpose: "LOGIN",
    phone: input.phone,
    ip: input.ip,
    userId: input.userId,
  });
}

export async function createRegistrationOtpChallenge(input: {
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string;
  ip?: string | null;
}): Promise<CreateOtpChallengeResult> {
  return issueChallenge({
    purpose: "REGISTRATION",
    phone: input.phone,
    ip: input.ip,
    pendingFullName: input.fullName,
    pendingEmail: input.email,
    pendingPhone: input.phone,
    pendingPasswordHash: input.passwordHash,
  });
}

export async function verifyOtpChallenge(input: {
  token: string;
  code: string;
}): Promise<VerifyOtpChallengeResult> {
  const token = input.token.trim();
  const code = input.code.trim();
  if (!token || !code) {
    return { ok: false, formError: "Enter the verification code." };
  }

  const prisma = getPrisma();
  const tokenHash = hashSessionToken(token);
  const row = await prisma.otpChallenge.findUnique({ where: { tokenHash } });
  if (!row) {
    return { ok: false, formError: "That verification code has expired. Request a new one." };
  }
  if (row.consumedAt) {
    return { ok: false, formError: "That verification code has already been used. Request a new one." };
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await prisma.otpChallenge.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, formError: "That verification code has expired. Request a new one." };
  }
  if (row.attempts >= row.maxAttempts) {
    await prisma.otpChallenge.update({
      where: { id: row.id },
      data: { consumedAt: new Date() },
    });
    return { ok: false, formError: "Too many incorrect attempts. Request a new code." };
  }

  if (hashCode(code) !== row.codeHash) {
    const updated = await prisma.otpChallenge.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true, maxAttempts: true },
    });
    const remaining = Math.max(0, updated.maxAttempts - updated.attempts);
    return {
      ok: false,
      formError:
        remaining > 0
          ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} left.`
          : "Too many incorrect attempts. Request a new code.",
    };
  }

  await prisma.otpChallenge.update({
    where: { id: row.id },
    data: { consumedAt: new Date() },
  });

  return {
    ok: true,
    purpose: row.purpose,
    userId: row.userId,
    pendingFullName: row.pendingFullName,
    pendingEmail: row.pendingEmail,
    pendingPhone: row.pendingPhone,
    pendingPasswordHash: row.pendingPasswordHash,
  };
}
