/**
 * Storefront-facing branding from `SiteSettings` (phone, email, logos).
 */
import { getPrisma } from "@/lib/db/prisma";
import {
  clampLogoHeight,
  LOGO_HEIGHT_DEFAULT,
} from "@/lib/business/logo-size";
import { DEFAULT_BUSINESS_SETTINGS } from "@/lib/admin/settings-mock";
import { usesDatabase } from "@/lib/runtime/data-source";

export type StorefrontBranding = {
  storeName: string;
  supportEmail: string;
  phone: string;
  phoneHref: string;
  emailHref: string;
  address: string;
  city: string;
  /** Google Maps share/embed link (Business Settings → General). Empty hides
   * the footer's location map. */
  googleMapsUrl: string;
  /** Logo for dark header/footer bars. */
  /** Logo for light surfaces. */
  logoSrc: string | null;
  faviconSrc: string | null;
  /** Rendered logo height in px (admin-set). */
  logoHeightPx: number;
};

function phoneToHref(phone: string): string {
  const trimmed = phone.trim();
  if (!trimmed) {
    return "/contact";
  }
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "/contact";
}

function emailToHref(email: string): string {
  const trimmed = email.trim();
  return trimmed ? `mailto:${trimmed}` : "/contact";
}

export function defaultStorefrontBranding(): StorefrontBranding {
  const phone = DEFAULT_BUSINESS_SETTINGS.phone;
  const email = DEFAULT_BUSINESS_SETTINGS.supportEmail;
  return {
    storeName: DEFAULT_BUSINESS_SETTINGS.storeName,
    supportEmail: email,
    phone,
    phoneHref: phoneToHref(phone),
    emailHref: emailToHref(email),
    address: DEFAULT_BUSINESS_SETTINGS.address,
    city: DEFAULT_BUSINESS_SETTINGS.city,
    googleMapsUrl: "",
    logoSrc: null,
    faviconSrc: null,
    logoHeightPx: LOGO_HEIGHT_DEFAULT,
  };
}

export async function getStorefrontBranding(): Promise<StorefrontBranding> {
  const fallback = defaultStorefrontBranding();
  if (!usesDatabase()) {
    return fallback;
  }
  const row = await getPrisma().siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      storeName: true,
      supportEmail: true,
      phone: true,
      address: true,
      city: true,
      googleMapsUrl: true,
      logoSrc: true,
      logoHeightPx: true,
      faviconSrc: true,
    },
  });
  if (!row) {
    return fallback;
  }
  const phone = row.phone?.trim() || fallback.phone;
  const email = row.supportEmail?.trim() || fallback.supportEmail;
  return {
    storeName: row.storeName.trim() || fallback.storeName,
    supportEmail: email,
    phone,
    phoneHref: phoneToHref(phone),
    emailHref: emailToHref(email),
    address: row.address?.trim() || fallback.address,
    city: row.city?.trim() || fallback.city,
    googleMapsUrl: row.googleMapsUrl?.trim() || "",
    logoSrc: row.logoSrc?.trim() || null,
    faviconSrc: row.faviconSrc?.trim() || null,
    // Clamped on read as well as on write: this value is also reachable by a
    // direct database edit, and it goes straight into an inline style.
    logoHeightPx: clampLogoHeight(row.logoHeightPx),
  };
}

/**
 * The store logo. Kept as a function rather than reading `logoSrc` directly
 * at each call site so there is still one place to change if a second
 * variant is ever needed again.
 */
export function resolveChromeLogo(branding: StorefrontBranding): string | null {
  return branding.logoSrc || null;
}
