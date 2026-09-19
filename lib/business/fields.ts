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

export function normalizeBusinessTimezone(
  raw: string,
): BusinessTimezone | null {
  const value = raw.trim();
  if (!TIMEZONE_SET.has(value)) {
    return null;
  }
  return value as BusinessTimezone;
}
