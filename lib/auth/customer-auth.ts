/**
 * Customer register / login / profile mutations (P11-T01).
 *
 * Never returns whether an email exists on failed login — same generic error.
 * Passwords are never logged or returned.
 */
import {
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
  validateLoginInput,
  validateProfileInput,
  validateRegisterInput,
  validateForgotInput,
  validatePassword,
  type AccountFieldErrors,
} from "@/lib/account/validation";
import {
  hashPassword,
  verifyPassword,
  DUMMY_PASSWORD_HASH,
} from "@/lib/auth/password";
import {
  createCustomerSession,
  getCustomerSession,
  revokeCurrentCustomerSession,
} from "@/lib/auth/customer-session";
import { revokeAllCustomerSessions } from "@/lib/auth/session-policy";
import { getPrisma } from "@/lib/db/prisma";
import {
  limitCustomerLogin,
  limitCustomerRegister,
  limitForgotPassword,
} from "@/lib/auth/rate-limit";
import { mergeGuestCartFromCookie } from "@/lib/cart/persist";
import { getAdminOtpConfig } from "@/lib/otp/config";
import {
  createLoginOtpChallenge,
  createRegistrationOtpChallenge,
  verifyOtpChallenge,
} from "@/lib/otp/challenge";

export type AuthActionResult =
  | { ok: true }
  | { ok: true; otpRequired: true; token: string; phoneHint: string }
  | { ok: false; formError?: string; fieldErrors?: AccountFieldErrors };

function emptyPhoneToNull(phone: string): string | null {
  const normalized = normalizePhone(phone);
  return normalized.length > 0 ? normalized : null;
}

export async function registerCustomer(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<AuthActionResult> {
  const fieldErrors = validateRegisterInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const limited = await limitCustomerRegister(input.ip);
  if (!limited.ok) {
    return limited;
  }

  const email = normalizeEmail(input.email);
  const fullName = normalizeFullName(input.fullName);
  const phone = emptyPhoneToNull(input.phone);
  const prisma = getPrisma();

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    return {
      ok: false,
      fieldErrors: { email: "An account with this email already exists." },
    };
  }

  if (phone) {
    const phoneTaken = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (phoneTaken) {
      return {
        ok: false,
        fieldErrors: { phone: "This phone number is already in use." },
      };
    }
  }

  const passwordHash = await hashPassword(input.password);

  const otpConfig = await getAdminOtpConfig();
  if (otpConfig.otpRegistration && phone) {
    const challenge = await createRegistrationOtpChallenge({
      fullName,
      email,
      phone,
      passwordHash,
      ip: input.ip,
    });
    if (!challenge.ok) {
      return { ok: false, formError: challenge.formError };
    }
    return {
      ok: true,
      otpRequired: true,
      token: challenge.token,
      phoneHint: challenge.phoneHint,
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      phone,
      passwordHash,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  await createCustomerSession({
    userId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  try {
    await mergeGuestCartFromCookie(user.id);
  } catch {
    // Registration still succeeds if cart merge cannot run.
  }

  return { ok: true };
}

export async function loginCustomer(input: {
  email: string;
  password: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<AuthActionResult> {
  const fieldErrors = validateLoginInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const email = normalizeEmail(input.email);
  const limited = await limitCustomerLogin(input.ip, email);
  if (!limited.ok) {
    return limited;
  }

  const user = await getPrisma().user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
      status: true,
      phone: true,
    },
  });

  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const passwordOk = await verifyPassword(passwordHash, input.password);

  if (!user || !user.passwordHash || !passwordOk) {
    return {
      ok: false,
      formError: "Invalid email or password.",
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      ok: false,
      formError:
        "This account is not available. Contact support if you need help.",
    };
  }

  const otpConfig = await getAdminOtpConfig();
  if (otpConfig.otpLogin && user.phone) {
    const challenge = await createLoginOtpChallenge({
      userId: user.id,
      phone: user.phone,
      ip: input.ip,
    });
    if (!challenge.ok) {
      return { ok: false, formError: challenge.formError };
    }
    return {
      ok: true,
      otpRequired: true,
      token: challenge.token,
      phoneHint: challenge.phoneHint,
    };
  }

  await getPrisma().user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createCustomerSession({
    userId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  try {
    await mergeGuestCartFromCookie(user.id);
  } catch {
    // Login still succeeds if cart merge cannot run.
  }

  return { ok: true };
}

/**
 * Second step of the OTP 2FA flow: verifies the code from
 * createLoginOtpChallenge/createRegistrationOtpChallenge and, on success,
 * finishes whichever real auth action (login or registration) was paused
 * waiting on it — creating the session (and, for registration, the account
 * itself) only now.
 */
export async function verifyAuthOtp(input: {
  token: string;
  code: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<AuthActionResult> {
  const verified = await verifyOtpChallenge({
    token: input.token,
    code: input.code,
  });
  if (!verified.ok) {
    return { ok: false, formError: verified.formError };
  }

  const prisma = getPrisma();

  if (verified.purpose === "LOGIN") {
    if (!verified.userId) {
      return { ok: false, formError: "That verification code is no longer valid." };
    }
    const user = await prisma.user.findUnique({
      where: { id: verified.userId },
      select: { id: true, status: true },
    });
    if (!user || user.status !== "ACTIVE") {
      return {
        ok: false,
        formError: "This account is not available. Contact support if you need help.",
      };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await createCustomerSession({
      userId: user.id,
      ip: input.ip,
      userAgent: input.userAgent,
    });
    try {
      await mergeGuestCartFromCookie(user.id);
    } catch {
      // Login still succeeds if cart merge cannot run.
    }
    return { ok: true };
  }

  // REGISTRATION
  if (
    !verified.pendingEmail ||
    !verified.pendingFullName ||
    !verified.pendingPhone ||
    !verified.pendingPasswordHash
  ) {
    return { ok: false, formError: "That verification code is no longer valid." };
  }

  const emailTaken = await prisma.user.findUnique({
    where: { email: verified.pendingEmail },
    select: { id: true },
  });
  if (emailTaken) {
    return {
      ok: false,
      fieldErrors: { email: "An account with this email already exists." },
    };
  }
  const phoneTaken = await prisma.user.findUnique({
    where: { phone: verified.pendingPhone },
    select: { id: true },
  });
  if (phoneTaken) {
    return {
      ok: false,
      fieldErrors: { phone: "This phone number is already in use." },
    };
  }

  const user = await prisma.user.create({
    data: {
      email: verified.pendingEmail,
      fullName: verified.pendingFullName,
      phone: verified.pendingPhone,
      passwordHash: verified.pendingPasswordHash,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  await createCustomerSession({
    userId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  try {
    await mergeGuestCartFromCookie(user.id);
  } catch {
    // Registration still succeeds if cart merge cannot run.
  }

  return { ok: true };
}

export async function logoutCustomer(): Promise<void> {
  await revokeCurrentCustomerSession();
}

export async function updateCustomerProfile(input: {
  fullName: string;
  email: string;
  phone: string;
}): Promise<AuthActionResult> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to update your profile." };
  }

  const fieldErrors = validateProfileInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const email = normalizeEmail(input.email);
  const fullName = normalizeFullName(input.fullName);
  const phone = emptyPhoneToNull(input.phone);
  const prisma = getPrisma();

  if (email !== session.email) {
    const taken = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken && taken.id !== session.userId) {
      return {
        ok: false,
        fieldErrors: { email: "An account with this email already exists." },
      };
    }
  }

  if (phone) {
    const phoneTaken = await prisma.user.findUnique({
      where: { phone },
      select: { id: true },
    });
    if (phoneTaken && phoneTaken.id !== session.userId) {
      return {
        ok: false,
        fieldErrors: { phone: "This phone number is already in use." },
      };
    }
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      email,
      fullName,
      phone,
      // Changing email clears verification until a future verify flow.
      emailVerifiedAt: email === session.email ? undefined : null,
    },
  });

  return { ok: true };
}

export async function requestPasswordReset(input: {
  email: string;
  ip?: string | null;
}): Promise<AuthActionResult> {
  const fieldErrors = validateForgotInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const limited = await limitForgotPassword(input.ip);
  if (!limited.ok) {
    return limited;
  }

  // SMTP is Phase 16. Always succeed so we never reveal whether the email exists.
  return { ok: true };
}

/**
 * Change the password of the signed-in customer.
 *
 * Security notes, all deliberate:
 * - The current password is re-verified even though the caller is already
 *   authenticated. A session left open on a shared machine must not be enough
 *   to take the account over.
 * - Every other session is revoked afterwards. That is the point of changing
 *   a password after a scare: whoever else is signed in gets kicked out. The
 *   current device is then re-issued a session so the customer is not logged
 *   out of the tab they are standing in.
 * - Verification runs against the real hash with `verifyPassword`, which is
 *   constant-time, and nothing about the failure distinguishes a wrong
 *   password from any other rejection.
 */
export async function changeCustomerPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<AuthActionResult> {
  const session = await getCustomerSession();
  if (!session) {
    return { ok: false, formError: "Sign in to change your password." };
  }

  const strengthError = validatePassword(input.newPassword);
  if (strengthError) {
    return { ok: false, fieldErrors: { newPassword: strengthError } };
  }
  if (input.newPassword !== input.confirmPassword) {
    return {
      ok: false,
      fieldErrors: { confirmPassword: "Both passwords must match." },
    };
  }
  if (input.newPassword === input.currentPassword) {
    return {
      ok: false,
      fieldErrors: { newPassword: "Choose a password you have not used here before." },
    };
  }

  const prisma = getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, passwordHash: true },
  });

  const ok = await verifyPassword(
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    input.currentPassword,
  );
  if (!user || !ok) {
    return {
      ok: false,
      fieldErrors: { currentPassword: "That is not your current password." },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });

  await revokeAllCustomerSessions(user.id);
  await createCustomerSession({
    userId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  return { ok: true };
}
