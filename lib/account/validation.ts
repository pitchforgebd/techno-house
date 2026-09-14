/**
 * Customer account field validation and normalization.
 * Shared by forms and server-side auth (P11-T01).
 */

import {
  weakPasswordReason,
  type WeakPasswordContext,
} from "@/lib/account/weak-passwords";

export const ACCOUNT_EMAIL_MAX = 160;
export const ACCOUNT_NAME_MAX = 80;
export const ACCOUNT_PHONE_MAX = 20;
export const ACCOUNT_PASSWORD_MIN = 8;
export const ACCOUNT_PASSWORD_MAX = 72;

export type AccountFieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase().slice(0, ACCOUNT_EMAIL_MAX);
}

export function normalizeFullName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, ACCOUNT_NAME_MAX);
}

export function normalizePhone(raw: string): string {
  return raw.trim().slice(0, ACCOUNT_PHONE_MAX);
}

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email) && email.length <= ACCOUNT_EMAIL_MAX;
}

/**
 * The length floor stays at 8, which is what NIST recommends — composition
 * rules (a digit, a symbol, a capital) mostly push people toward `Password1!`
 * and are not required. What was missing is the other half of that guidance:
 * refusing passwords already known to be guessable (F-07).
 *
 * `context` is optional so existing callers keep working; pass it where the
 * account's email or name is known, so those can be rejected too.
 */
export function validatePassword(
  password: string,
  context?: WeakPasswordContext,
): string | null {
  if (password.length < ACCOUNT_PASSWORD_MIN) {
    return `Use at least ${ACCOUNT_PASSWORD_MIN} characters.`;
  }
  if (password.length > ACCOUNT_PASSWORD_MAX) {
    return `Use at most ${ACCOUNT_PASSWORD_MAX} characters.`;
  }
  return weakPasswordReason(password, context);
}

export function validateLoginInput(input: {
  email: string;
  password: string;
}): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  const email = normalizeEmail(input.email);
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  // Sign-in checks only that a password was supplied.
  //
  // Strength rules belong to registration and password change, never here: an
  // account created before those rules existed would otherwise be unable to
  // sign in at all, and the person would have no way to fix it — password
  // reset is not implemented (F-16). Running strength checks at sign-in also
  // leaks policy information to an attacker who has not authenticated.
  if (!input.password) {
    errors.password = "Enter your password.";
  }
  return errors;
}

export function validateRegisterInput(input: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  const fullName = normalizeFullName(input.fullName);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!fullName) {
    errors.fullName = "Enter your name.";
  }
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (phone && phone.length < 8) {
    errors.phone = "Enter a valid phone number, or leave it blank.";
  }
  const passwordError = validatePassword(input.password, {
    email: input.email,
    fullName: input.fullName,
  });
  if (passwordError) {
    errors.password = passwordError;
  }
  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateForgotInput(input: {
  email: string;
}): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  const email = normalizeEmail(input.email);
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

export function validateProfileInput(input: {
  fullName: string;
  email: string;
  phone: string;
}): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  const fullName = normalizeFullName(input.fullName);
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  if (!fullName) {
    errors.fullName = "Enter your name.";
  }
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (phone && phone.length < 8) {
    errors.phone = "Enter a valid phone number, or leave it blank.";
  }
  return errors;
}
