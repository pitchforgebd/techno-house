/**
 * B2B (wholesale) registration — AD-B2B.
 *
 * A B2B buyer gets their own entry point (`/b2b/register`, `/b2b/login`,
 * `/b2b/profile`) but the identity underneath is a normal customer `User`.
 * That is deliberate: cart, orders, addresses, and checkout are all keyed to
 * `User`, and a second identity table would mean duplicating every one of
 * those money-critical paths. The B2B part is the `B2BAccount` row plus the
 * admin verification that unlocks wholesale pricing.
 *
 * Registration here does not go through the OTP branch that
 * `registerCustomer` has: admin verification is already the real gate for
 * wholesale access, and it happens before any B2B price is ever shown.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { createCustomerSession } from "@/lib/auth/customer-session";
import { hashPassword } from "@/lib/auth/password";
import { limitCustomerRegister } from "@/lib/auth/rate-limit";
import {
  isValidEmail,
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
  validatePassword,
  type AccountFieldErrors,
} from "@/lib/account/validation";
import { getPrisma } from "@/lib/db/prisma";

import { B2B_COMPANY_MAX, B2B_NID_MAX } from "@/lib/b2b/limits";

export { B2B_COMPANY_MAX, B2B_NID_MAX };

export type B2BRegisterResult =
  | { ok: true }
  | { ok: false; formError?: string; fieldErrors?: AccountFieldErrors };

export type B2BRegisterInput = {
  fullName: string;
  company: string;
  email: string;
  phone: string;
  nidNumber: string;
  password: string;
  confirmPassword: string;
  ip?: string | null;
  userAgent?: string | null;
};

function validate(input: B2BRegisterInput): AccountFieldErrors {
  const errors: AccountFieldErrors = {};

  if (!normalizeFullName(input.fullName)) {
    errors.fullName = "Enter your name.";
  }
  if (!input.company.trim()) {
    errors.company = "Enter your business or shop name.";
  }
  const email = normalizeEmail(input.email);
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  // Phone is optional for retail customers but a wholesale account is
  // contacted by phone, so it is required here.
  if (!normalizePhone(input.phone)) {
    errors.phone = "Enter your phone number.";
  }
  const nid = input.nidNumber.trim();
  if (!nid) {
    errors.nidNumber = "Enter your NID number.";
  } else if (!/^[0-9]{10,17}$/.test(nid.replace(/[\s-]/g, ""))) {
    errors.nidNumber = "NID number should be 10–17 digits.";
  }
  const passwordError = validatePassword(input.password);
  if (passwordError) {
    errors.password = passwordError;
  } else if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return errors;
}

export async function registerB2BAccount(
  input: B2BRegisterInput,
): Promise<B2BRegisterResult> {
  const fieldErrors = validate(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const limited = await limitCustomerRegister(input.ip);
  if (!limited.ok) {
    return limited;
  }

  const email = normalizeEmail(input.email);
  const fullName = normalizeFullName(input.fullName);
  const phone = normalizePhone(input.phone);
  const company = input.company.trim().slice(0, B2B_COMPANY_MAX);
  const nidNumber = input.nidNumber.trim().slice(0, B2B_NID_MAX);
  const prisma = getPrisma();

  const [emailTaken, phoneTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.user.findUnique({ where: { phone }, select: { id: true } }),
  ]);
  if (emailTaken) {
    return {
      ok: false,
      fieldErrors: {
        email:
          "An account with this email already exists — sign in and apply for wholesale instead.",
      },
    };
  }
  if (phoneTaken) {
    return {
      ok: false,
      fieldErrors: { phone: "This phone number is already in use." },
    };
  }

  const passwordHash = await hashPassword(input.password);

  // One transaction: an account without its B2B application (or the reverse)
  // would leave the buyer stuck with no way to finish signing up.
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email, fullName, phone, passwordHash, status: "ACTIVE" },
      select: { id: true },
    });
    await tx.b2BAccount.create({
      data: {
        userId: created.id,
        company,
        contactName: fullName,
        nidNumber,
        status: "PENDING",
      },
    });
    return created;
  });

  await createCustomerSession({
    userId: user.id,
    ip: input.ip,
    userAgent: input.userAgent,
  });

  await writeAuditLog({
    actorType: "CUSTOMER",
    actorId: user.id,
    action: AUDIT_ACTIONS.B2B_APPLY,
    entityType: "B2BAccount",
    entityId: user.id,
    ip: input.ip,
    metadata: { company, via: "b2b-register" },
  });

  return { ok: true };
}
