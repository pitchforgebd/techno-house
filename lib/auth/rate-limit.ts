/**
 * PostgreSQL-backed auth rate limits (P11-T06).
 *
 * Bucket keys are hashed IP or email — never the raw value. A few extra
 * attempts can slip through under concurrent writes; that is acceptable
 * for these limits.
 */
import { hashIp } from "@/lib/auth/session-token";
import { getPrisma } from "@/lib/db/prisma";

export const RATE_LIMIT_MESSAGE =
  "Too many attempts. Try again in a few minutes.";

export const AUTH_RATE_LIMITS = {
  customerLoginIp: { limit: 10, windowMs: 15 * 60 * 1000 },
  customerLoginEmail: { limit: 5, windowMs: 15 * 60 * 1000 },
  staffLoginIp: { limit: 8, windowMs: 15 * 60 * 1000 },
  staffLoginEmail: { limit: 5, windowMs: 15 * 60 * 1000 },
  registerIp: { limit: 5, windowMs: 60 * 60 * 1000 },
  forgotIp: { limit: 5, windowMs: 15 * 60 * 1000 },
  otpSendPhone: { limit: 3, windowMs: 10 * 60 * 1000 },
  otpSendIp: { limit: 8, windowMs: 10 * 60 * 1000 },
  /**
   * Public order tracking (DSA-05). Unauthenticated, and order numbers are a
   * dense sequence, so this is the only thing standing between an attacker and
   * a full walk of the order table. Keyed on the queried value as well as the
   * caller, because the IP half is spoofable via `X-Forwarded-For` (F-04) —
   * the per-key bucket still bites when the IP bucket is evaded.
   */
  trackLookupIp: { limit: 20, windowMs: 10 * 60 * 1000 },
  trackLookupKey: { limit: 10, windowMs: 10 * 60 * 1000 },
  /**
   * Unauthenticated storefront forms — complaints, support requests, product
   * requests. Generous, because these are real customers with a real problem;
   * the point is to stop a script filling the staff queue, not to police
   * someone who mistypes twice.
   */
  publicFormIp: { limit: 8, windowMs: 15 * 60 * 1000 },
} as const;

const STALE_MS = 24 * 60 * 60 * 1000;

export type RateLimitResult = { ok: true } | { ok: false; formError: string };

function bucket(kind: string, hashed: string): string {
  return `${kind}:${hashed}`;
}

function fingerprint(value: string | null | undefined): string {
  return hashIp(value) ?? "unknown";
}

async function consumeBucket(
  bucketKey: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const prisma = getPrisma();
  const now = new Date();
  const existing = await prisma.authRateLimit.findUnique({
    where: { bucketKey },
    select: { count: true, windowStart: true },
  });

  if (!existing || now.getTime() - existing.windowStart.getTime() >= windowMs) {
    await prisma.authRateLimit.upsert({
      where: { bucketKey },
      create: { bucketKey, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1 },
    });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  const updated = await prisma.authRateLimit.updateMany({
    where: { bucketKey, count: { lt: limit } },
    data: { count: { increment: 1 } },
  });
  return updated.count === 1;
}

async function consumeAll(
  checks: { key: string; limit: number; windowMs: number }[],
): Promise<RateLimitResult> {
  // Stops at the first refusal (F-16). Continuing burned a count from every
  // remaining bucket for a request that was already going to be rejected — so
  // an attacker hammering one spoofable IP bucket also consumed the caller's
  // per-email budget, and a legitimate user behind that IP hit their own limit
  // sooner than they should have.
  for (const check of checks) {
    const ok = await consumeBucket(check.key, check.limit, check.windowMs);
    if (!ok) {
      return { ok: false, formError: RATE_LIMIT_MESSAGE };
    }
  }
  return { ok: true };
}

async function pruneStale(): Promise<void> {
  try {
    await getPrisma().authRateLimit.deleteMany({
      where: { windowStart: { lt: new Date(Date.now() - STALE_MS) } },
    });
  } catch {
    // Non-fatal — counters still work if cleanup skips a round.
  }
}

export async function limitCustomerLogin(
  ip: string | null | undefined,
  email: string,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("customer.login.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.customerLoginIp,
    },
    {
      key: bucket("customer.login.email", fingerprint(email)),
      ...AUTH_RATE_LIMITS.customerLoginEmail,
    },
  ]);
  void pruneStale();
  return result;
}

export async function limitStaffLogin(
  ip: string | null | undefined,
  email: string,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("staff.login.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.staffLoginIp,
    },
    {
      key: bucket("staff.login.email", fingerprint(email)),
      ...AUTH_RATE_LIMITS.staffLoginEmail,
    },
  ]);
  void pruneStale();
  return result;
}

export async function limitCustomerRegister(
  ip: string | null | undefined,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("customer.register.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.registerIp,
    },
  ]);
  void pruneStale();
  return result;
}

/** Caps how often a new OTP code can be sent to the same phone/IP. */
export async function limitOtpSend(
  phone: string,
  ip: string | null | undefined,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("otp.send.phone", fingerprint(phone)),
      ...AUTH_RATE_LIMITS.otpSendPhone,
    },
    {
      key: bucket("otp.send.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.otpSendIp,
    },
  ]);
  void pruneStale();
  return result;
}

/**
 * Caps public tracking lookups. `key` is the order number or phone being
 * queried, so guessing many different values burns the IP bucket and hammering
 * one value burns the key bucket.
 */
export async function limitPublicTracking(
  ip: string | null | undefined,
  key: string,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("track.lookup.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.trackLookupIp,
    },
    {
      key: bucket("track.lookup.key", fingerprint(key.toLowerCase())),
      ...AUTH_RATE_LIMITS.trackLookupKey,
    },
  ]);
  void pruneStale();
  return result;
}

/** Caps unauthenticated storefront form submissions from one caller. */
export async function limitPublicForm(
  ip: string | null | undefined,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("public.form.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.publicFormIp,
    },
  ]);
  void pruneStale();
  return result;
}

export async function limitForgotPassword(
  ip: string | null | undefined,
): Promise<RateLimitResult> {
  const result = await consumeAll([
    {
      key: bucket("customer.forgot.ip", fingerprint(ip)),
      ...AUTH_RATE_LIMITS.forgotIp,
    },
  ]);
  void pruneStale();
  return result;
}
