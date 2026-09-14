export type AdminAnalyticsConfig = {
  provider: "GA4" | "GTM";
  isEnabled: boolean;
  publicId: string;
  propertyId: string;
};

const GA4_PATTERN = /^G-[A-Z0-9]{4,20}$/;
const GTM_PATTERN = /^GTM-[A-Z0-9]{4,20}$/;
const PROPERTY_PATTERN = /^\d{1,20}$/;
const PIXEL_PATTERN = /^\d{5,20}$/;
const MERCHANT_PATTERN = /^\d{3,20}$/;

export function normalizeGa4Id(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) {
    return "";
  }
  return GA4_PATTERN.test(value) ? value : null;
}

export function normalizeGtmId(raw: string): string | null {
  const value = raw.trim().toUpperCase();
  if (!value) {
    return "";
  }
  return GTM_PATTERN.test(value) ? value : null;
}

export function normalizeGa4PropertyId(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  return PROPERTY_PATTERN.test(value) ? value : null;
}

export function normalizePixelId(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  return PIXEL_PATTERN.test(value) ? value : null;
}

export function normalizeMerchantId(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  return MERCHANT_PATTERN.test(value) ? value : null;
}

export function normalizeCatalogId(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  return MERCHANT_PATTERN.test(value) ? value : null;
}

export type AdminMetaConfig = {
  isEnabled: boolean;
  publicId: string;
  catalogId: string;
};

export type AdminMerchantConfig = {
  isEnabled: boolean;
  publicId: string;
};
