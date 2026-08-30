export const MOCK_CUSTOMER_STORAGE_KEY = "techno-house-mock-customer-v1";

export const ACCOUNT_EMAIL_MAX = 160;
export const ACCOUNT_NAME_MAX = 80;
export const ACCOUNT_PHONE_MAX = 20;
export const ACCOUNT_PASSWORD_MIN = 8;
export const ACCOUNT_PASSWORD_MAX = 72;

export type MockCustomerSession = {
  kind: "mock-customer";
  email: string;
  fullName: string;
  phone: string;
};

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

export function validatePassword(password: string): string | null {
  if (password.length < ACCOUNT_PASSWORD_MIN) {
    return `Use at least ${ACCOUNT_PASSWORD_MIN} characters.`;
  }
  if (password.length > ACCOUNT_PASSWORD_MAX) {
    return `Use at most ${ACCOUNT_PASSWORD_MAX} characters.`;
  }
  return null;
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
  if (!input.password) {
    errors.password = "Enter your password.";
  } else {
    const passwordError = validatePassword(input.password);
    if (passwordError) {
      errors.password = passwordError;
    }
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
  const passwordError = validatePassword(input.password);
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

export function createMockCustomerSession(input: {
  email: string;
  fullName: string;
  phone?: string;
}): MockCustomerSession {
  return {
    kind: "mock-customer",
    email: normalizeEmail(input.email),
    fullName: normalizeFullName(input.fullName) || "Customer",
    phone: normalizePhone(input.phone ?? ""),
  };
}

export function parseMockCustomerSession(
  raw: unknown,
): MockCustomerSession | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<MockCustomerSession>;
  if (data.kind !== "mock-customer") {
    return null;
  }
  if (
    typeof data.email !== "string" ||
    !isValidEmail(normalizeEmail(data.email))
  ) {
    return null;
  }
  if (typeof data.fullName !== "string") {
    return null;
  }
  return createMockCustomerSession({
    email: data.email,
    fullName: data.fullName,
    phone: typeof data.phone === "string" ? data.phone : "",
  });
}
