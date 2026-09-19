export const BUSINESS_TIMEZONES = [
  { value: "Asia/Dhaka", label: "Asia/Dhaka (GMT+6)" },
  { value: "UTC", label: "UTC" },
] as const;

export type BusinessTimezone = (typeof BUSINESS_TIMEZONES)[number]["value"];

export const STORE_NAME_MAX = 80;
export const LEGAL_NAME_MAX = 120;
export const SUPPORT_EMAIL_MAX = 120;
export const PHONE_MAX = 40;
export const ADDRESS_MAX = 240;
export const CITY_MAX = 80;
export const TAX_ID_MAX = 64;
export const GOOGLE_MAPS_URL_MAX = 500;
export const EXTRA_ADDRESS_TITLE_MAX = 80;
export const EXTRA_ADDRESSES_LIMIT = 10;
export const EXTRA_PHONES_LIMIT = 10;
export const EXTRA_EMAILS_LIMIT = 10;

/** An additional address (e.g. a second branch) with its own title, shown
 * below the primary address in the storefront footer. */
export type BusinessExtraAddress = {
  id: string;
  title: string;
  address: string;
};

export type AdminBusinessSettings = {
  storeName: string;
  legalName: string;
  supportEmail: string;
  phone: string;
  address: string;
  city: string;
  timezone: BusinessTimezone;
  taxId: string;
  googleMapsUrl: string;
  extraAddresses: BusinessExtraAddress[];
  extraPhones: string[];
  extraEmails: string[];
  logoSrc: string;
  logoHeightPx: number;
  faviconSrc: string;
  updatedAt: string | null;
};

const TIMEZONE_SET = new Set<string>(BUSINESS_TIMEZONES.map((t) => t.value));

function stripControlChars(raw: string): string {
  return raw.replace(/[<>]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeStoreName(raw: string): string | null {
  const value = stripControlChars(raw);
  if (!value || value.length > STORE_NAME_MAX) {
    return null;
  }
  return value;
}

export function normalizeOptionalText(raw: string, max: number): string | null {
  const value = stripControlChars(raw);
  if (value.length > max) {
    return null;
  }
  return value;
}

export function normalizeSupportEmail(raw: string): string | null {
  const value = stripControlChars(raw).toLowerCase();
  if (!value) {
    return "";
  }
  if (value.length > SUPPORT_EMAIL_MAX) {
    return null;
  }
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value)) {
    return null;
  }
  return value;
}

/** Empty is allowed (map hidden); anything set must be an http(s) URL. */
export function normalizeGoogleMapsUrl(raw: string): string | null {
  const value = stripControlChars(raw);
  if (!value) {
    return "";
  }
  if (value.length > GOOGLE_MAPS_URL_MAX) {
    return null;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  return value;
}

function newFieldId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Drops rows with no title and no address; caps count and field lengths. */
export function normalizeExtraAddresses(
  raw: unknown,
): BusinessExtraAddress[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  if (raw.length > EXTRA_ADDRESSES_LIMIT) {
    return null;
  }
  const result: BusinessExtraAddress[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const row = entry as Record<string, unknown>;
    const title = stripControlChars(String(row.title ?? "")).slice(
      0,
      EXTRA_ADDRESS_TITLE_MAX,
    );
    const address = stripControlChars(String(row.address ?? "")).slice(
      0,
      ADDRESS_MAX,
    );
    if (!title && !address) {
      continue;
    }
    result.push({
      id: String(row.id ?? "").trim() || newFieldId("address"),
      title,
      address,
    });
  }
  return result;
}

/** Drops blank entries; caps count and length. Empty strings are allowed
 * through so a still-typing input doesn't get silently dropped mid-edit. */
export function normalizeExtraPhones(raw: string[]): string[] | null {
  if (!Array.isArray(raw) || raw.length > EXTRA_PHONES_LIMIT) {
    return null;
  }
  const result: string[] = [];
  for (const value of raw) {
    const phone = stripControlChars(String(value ?? "")).slice(0, PHONE_MAX);
    if (phone) {
      result.push(phone);
    }
  }
  return result;
}

/** Drops blank entries; every non-blank entry must be a valid email. */
export function normalizeExtraEmails(raw: string[]): string[] | null {
  if (!Array.isArray(raw) || raw.length > EXTRA_EMAILS_LIMIT) {
    return null;
  }
  const result: string[] = [];
  for (const value of raw) {
    const email = stripControlChars(String(value ?? "")).toLowerCase();
    if (!email) {
      continue;
    }
    if (
      email.length > SUPPORT_EMAIL_MAX ||
      !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)
    ) {
      return null;
    }
    result.push(email);
  }
  return result;
}

export function normalizeBusinessTimezone(
  raw: string,
): BusinessTimezone | null {
  const value = raw.trim();
  if (!TIMEZONE_SET.has(value)) {
    return null;
  }
  return value as BusinessTimezone;
}
