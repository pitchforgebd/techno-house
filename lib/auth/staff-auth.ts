/**
 * Staff login / logout (P11-T02).
 *
 * There is no self-serve staff registration. Failed login returns a generic
 * error and still spends Argon2 time against a dummy hash.
 */
import {
  normalizeEmail,
  validateLoginInput,
  type AccountFieldErrors,
} from "@/lib/account/validation";
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { DUMMY_PASSWORD_HASH, verifyPassword } from "@/lib/auth/password";
import { limitStaffLogin } from "@/lib/auth/rate-limit";
import {
  createStaffSession,
  getStaffSession,
  revokeCurrentStaffSession,
} from "@/lib/auth/staff-session";
import { hashIp } from "@/lib/auth/session-token";
import { getPrisma } from "@/lib/db/prisma";

/** Consecutive failures before an account is locked. */
export const STAFF_LOCKOUT_THRESHOLD = 10;

/** How long a locked staff account stays locked. */
export const STAFF_LOCKOUT_MS = 30 * 60 * 1000;

export const STAFF_LOCKED_MESSAGE =
  "This account is temporarily locked after repeated failed sign-ins. Try again later or ask an administrator.";

export type StaffAuthResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: AccountFieldErrors };

export async function loginStaff(input: {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<StaffAuthResult> {
  const fieldErrors = validateLoginInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const email = normalizeEmail(input.email);
  const limited = await limitStaffLogin(input.ip, email);
  if (!limited.ok) {
    return limited;
  }

  const staff = await getPrisma().staff.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  const passwordHash = staff?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordOk = await verifyPassword(passwordHash, input.password);

  // Locked accounts are checked AFTER the password verification above, not
  // before, so a locked account costs an attacker exactly the same Argon2 time
  // as any other and the response cannot be used to discover which accounts
  // exist or which are locked.
  if (staff && staff.lockedUntil && staff.lockedUntil > new Date()) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: staff.id,
      action: AUDIT_ACTIONS.STAFF_LOGIN_BLOCKED,
      entityType: "Staff",
      entityId: staff.id,
      ip: input.ip,
      metadata: { reason: "locked" },
    });
    return { ok: false, formError: STAFF_LOCKED_MESSAGE };
  }

  if (!staff || !staff.passwordHash || !passwordOk) {
    if (staff) {
      // Persisted, unlike the sliding rate-limit window, so waiting out the
      // window does not reset an attacker's progress (F-05).
      const attempts = staff.failedLoginAttempts + 1;
      const locked = attempts >= STAFF_LOCKOUT_THRESHOLD;
      await getPrisma().staff.update({
        where: { id: staff.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil: locked
            ? new Date(Date.now() + STAFF_LOCKOUT_MS)
            : staff.lockedUntil,
        },
      });
      if (locked) {
        await writeAuditLog({
          actorType: "STAFF",
          actorId: staff.id,
          action: AUDIT_ACTIONS.STAFF_LOGIN_BLOCKED,
          entityType: "Staff",
          entityId: staff.id,
          ip: input.ip,
          metadata: { reason: "threshold_reached", attempts },
        });
      }
    }
    await writeAuditLog({
      actorType: "STAFF",
      action: AUDIT_ACTIONS.STAFF_LOGIN_FAILED,
      entityType: "Staff",
      metadata: { emailHash: hashIp(email) },
      ip: input.ip,
    });
    // Identical message whether the account exists, the password was wrong, or
    // the counter just tripped — the lock is never announced early.
    return { ok: false, formError: "Invalid email or password." };
  }

  if (staff.status !== "ACTIVE") {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: staff.id,
      action: AUDIT_ACTIONS.STAFF_LOGIN_BLOCKED,
      entityType: "Staff",
      entityId: staff.id,
      ip: input.ip,
    });
    return {
      ok: false,
      formError: "This staff account is not available.",
    };
  }

  // A successful sign-in clears the counter. Without this the threshold would
  // be cumulative over an account's whole life and would eventually lock out
  // someone who simply mistypes occasionally — which is how lockouts turn into
  // a denial of service against your own staff.
  await getPrisma().staff.update({
    where: { id: staff.id },
    data: {
      lastActiveAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  await createStaffSession({
    staffId: staff.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: staff.id,
    actorLabel: email,
    action: AUDIT_ACTIONS.STAFF_LOGIN,
    entityType: "Staff",
    entityId: staff.id,
    ip: input.ip,
  });

  return { ok: true };
}

export async function logoutStaff(): Promise<void> {
  const session = await getStaffSession();
  await revokeCurrentStaffSession();
  if (session) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: session.staffId,
      actorLabel: session.email,
      action: AUDIT_ACTIONS.STAFF_LOGOUT,
      entityType: "Staff",
      entityId: session.staffId,
    });
  }
}
