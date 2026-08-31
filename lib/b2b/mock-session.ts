import {
  isValidEmail,
  normalizeEmail,
  normalizeFullName,
  normalizePhone,
  validatePassword,
  type AccountFieldErrors,
} from "@/lib/account/mock-session";

export const B2B_SESSION_STORAGE_KEY = "techno-house-b2b-session-v1";
export const B2B_ACCOUNTS_STORAGE_KEY = "techno-house-b2b-accounts-v1";

export const B2B_SHOP_NAME_MAX = 120;
export const B2B_SHOP_ADDRESS_MAX = 240;

export type B2BAccount = {
  email: string;
  password: string;
  fullName: string;
  shopName: string;
  shopAddress: string;
  phone: string;
  tradeLicenceFileName: string;
  nidFileName: string;
  createdAt: string;
};

export type B2BSession = {
  kind: "b2b";
  email: string;
  fullName: string;
  shopName: string;
};

export function normalizeShopName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, B2B_SHOP_NAME_MAX);
}

export function normalizeShopAddress(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, B2B_SHOP_ADDRESS_MAX);
}

export function parseB2BSession(raw: unknown): B2BSession | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Partial<B2BSession>;
  if (
    value.kind !== "b2b" ||
    typeof value.email !== "string" ||
    typeof value.fullName !== "string" ||
    typeof value.shopName !== "string"
  ) {
    return null;
  }
  return {
    kind: "b2b",
    email: value.email,
    fullName: value.fullName,
    shopName: value.shopName,
  };
}

export function parseB2BAccounts(raw: unknown): B2BAccount[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const accounts: B2BAccount[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Partial<B2BAccount>;
    if (
      typeof row.email !== "string" ||
      typeof row.password !== "string" ||
      typeof row.fullName !== "string" ||
      typeof row.shopName !== "string" ||
      typeof row.shopAddress !== "string" ||
      typeof row.phone !== "string"
    ) {
      continue;
    }
    accounts.push({
      email: row.email,
      password: row.password,
      fullName: row.fullName,
      shopName: row.shopName,
      shopAddress: row.shopAddress,
      phone: row.phone,
      tradeLicenceFileName: row.tradeLicenceFileName ?? "",
      nidFileName: row.nidFileName ?? "",
      createdAt: row.createdAt ?? new Date().toISOString(),
    });
  }
  return accounts;
}

export function validateB2BRegisterInput(input: {
  fullName: string;
  shopName: string;
  shopAddress: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  tradeLicenceFileName: string;
  nidFileName: string;
}): AccountFieldErrors {
  const errors: AccountFieldErrors = {};
  const fullName = normalizeFullName(input.fullName);
  const shopName = normalizeShopName(input.shopName);
  const shopAddress = normalizeShopAddress(input.shopAddress);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  if (!fullName) {
    errors.fullName = "Enter your name.";
  }
  if (!shopName) {
    errors.shopName = "Enter your shop name.";
  }
  if (!shopAddress) {
    errors.shopAddress = "Enter your shop address.";
  }
  if (!phone) {
    errors.phone = "Enter your phone number.";
  }
  if (!email) {
    errors.email = "Enter your email.";
  } else if (!isValidEmail(email)) {
    errors.email = "Enter a valid email address.";
  }
  if (!input.password) {
    errors.password = "Enter a password.";
  } else {
    const passwordError = validatePassword(input.password);
    if (passwordError) {
      errors.password = passwordError;
    }
  }
  if (input.password !== input.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  if (!input.tradeLicenceFileName) {
    errors.tradeLicence = "Upload your trade licence.";
  }
  if (!input.nidFileName) {
    errors.nid = "Upload your NID image.";
  }
  return errors;
}

export function validateB2BLoginInput(input: {
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
  }
  return errors;
}

export function createB2BSession(account: B2BAccount): B2BSession {
  return {
    kind: "b2b",
    email: account.email,
    fullName: account.fullName,
    shopName: account.shopName,
  };
}
