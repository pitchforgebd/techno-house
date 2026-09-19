/**
 * Store business settings (P16-T07).
 *
 * Persists identity and contact fields on `SiteSettings`.
 * Currency stays BDT (not edited here). Order / tax / invoice / printer and
 * the other operations sub-pages are real as of Phase 1 — see
 * `lib/business/operations-config.ts`. `DATA_SOURCE=mock` refuses writes.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  clampLogoHeight,
  LOGO_HEIGHT_DEFAULT,
} from "@/lib/business/logo-size";
import {
  ADDRESS_MAX,
  CITY_MAX,
  LEGAL_NAME_MAX,
  PHONE_MAX,
  STORE_NAME_MAX,
  TAX_ID_MAX,
  normalizeBusinessTimezone,
  normalizeGoogleMapsUrl,
  normalizeOptionalText,
  normalizeStoreName,
  normalizeSupportEmail,
  type AdminBusinessSettings,
  type BusinessTimezone,
} from "@/lib/business/fields";
import { DEFAULT_BUSINESS_SETTINGS } from "@/lib/admin/settings-mock";

export type { AdminBusinessSettings } from "@/lib/business/fields";

export const BUSINESS_DB_REQUIRED =
  "Business settings need the database. Turn off DATA_SOURCE=mock to save.";

export type BusinessMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type BusinessActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

const EMPTY_ADMIN: AdminBusinessSettings = {
  storeName: DEFAULT_BUSINESS_SETTINGS.storeName,
  legalName: DEFAULT_BUSINESS_SETTINGS.legalName,
  supportEmail: DEFAULT_BUSINESS_SETTINGS.supportEmail,
  phone: DEFAULT_BUSINESS_SETTINGS.phone,
  address: DEFAULT_BUSINESS_SETTINGS.address,
  city: DEFAULT_BUSINESS_SETTINGS.city,
  timezone: "Asia/Dhaka",
  taxId: DEFAULT_BUSINESS_SETTINGS.taxId,
  googleMapsUrl: "",
  logoSrc: "",
  logoHeightPx: LOGO_HEIGHT_DEFAULT,
  faviconSrc: "",
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): BusinessMutationResult {
  return { ok: false, formError };
}

function toAdmin(row: {
  storeName: string;
  legalName: string | null;
  supportEmail: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  timezone: string;
  taxId: string | null;
  googleMapsUrl: string | null;
  logoSrc: string | null;
  logoHeightPx: number;
  faviconSrc: string | null;
  updatedAt: Date;
}): AdminBusinessSettings {
  return {
    storeName: row.storeName,
    legalName: row.legalName ?? "",
    supportEmail: row.supportEmail ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    timezone:
      (normalizeBusinessTimezone(row.timezone) as BusinessTimezone) ??
      "Asia/Dhaka",
    taxId: row.taxId ?? "",
    googleMapsUrl: row.googleMapsUrl ?? "",
    logoSrc: row.logoSrc ?? "",
    logoHeightPx: clampLogoHeight(row.logoHeightPx),
    faviconSrc: row.faviconSrc ?? "",
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminBusinessSettings(): Promise<AdminBusinessSettings> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().siteSettings.findUnique({
    where: { id: "singleton" },
    select: {
      storeName: true,
      legalName: true,
      supportEmail: true,
      phone: true,
      address: true,
      city: true,
      timezone: true,
      taxId: true,
      googleMapsUrl: true,
      logoSrc: true,
      logoHeightPx: true,
      faviconSrc: true,
      updatedAt: true,
    },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  return toAdmin(row);
}

export async function saveBusinessSettings(input: {
  storeName: string;
  legalName: string;
  supportEmail: string;
  phone: string;
  address: string;
  city: string;
  timezone: string;
  taxId: string;
  googleMapsUrl: string;
  actor?: BusinessActor;
}): Promise<BusinessMutationResult> {
  if (!usesDatabase()) {
    return fail(BUSINESS_DB_REQUIRED);
  }

  const storeName = normalizeStoreName(input.storeName);
  if (storeName == null) {
    return fail(
      `Store name is required and must be ${STORE_NAME_MAX} characters or fewer.`,
    );
  }
  const legalName = normalizeOptionalText(input.legalName, LEGAL_NAME_MAX);
  if (legalName == null) {
    return fail(`Legal name must be ${LEGAL_NAME_MAX} characters or fewer.`);
  }
  const supportEmail = normalizeSupportEmail(input.supportEmail);
  if (supportEmail == null) {
    return fail("Enter a valid support email, or leave it blank.");
  }
  const phone = normalizeOptionalText(input.phone, PHONE_MAX);
  if (phone == null) {
    return fail(`Phone must be ${PHONE_MAX} characters or fewer.`);
  }
  const address = normalizeOptionalText(input.address, ADDRESS_MAX);
  if (address == null) {
    return fail(`Address must be ${ADDRESS_MAX} characters or fewer.`);
  }
  const city = normalizeOptionalText(input.city, CITY_MAX);
  if (city == null) {
    return fail(`City must be ${CITY_MAX} characters or fewer.`);
  }
  const timezone = normalizeBusinessTimezone(input.timezone);
  if (timezone == null) {
    return fail("Choose a supported timezone.");
  }
  const taxId = normalizeOptionalText(input.taxId, TAX_ID_MAX);
  if (taxId == null) {
    return fail(`Tax / BIN ID must be ${TAX_ID_MAX} characters or fewer.`);
  }
  const googleMapsUrl = normalizeGoogleMapsUrl(input.googleMapsUrl);
  if (googleMapsUrl == null) {
    return fail("Enter a valid http(s) Google Maps link, or leave it blank.");
  }

  const row = await getPrisma().siteSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      storeName,
      legalName: legalName || null,
      supportEmail: supportEmail || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      timezone,
      taxId: taxId || null,
      googleMapsUrl: googleMapsUrl || null,
    },
    update: {
      storeName,
      legalName: legalName || null,
      supportEmail: supportEmail || null,
      phone: phone || null,
      address: address || null,
      city: city || null,
      timezone,
      taxId: taxId || null,
      googleMapsUrl: googleMapsUrl || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.BUSINESS_SETTINGS_UPDATE,
      entityType: "SiteSettings",
      entityId: row.id,
      metadata: {
        hasSupportEmail: Boolean(supportEmail),
        hasPhone: Boolean(phone),
        timezone,
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}

const PUBLIC_PATH_MAX = 240;

function normalizePublicAssetPath(raw: string): string | null {
  const value = raw.trim();
  if (!value) {
    return "";
  }
  if (value.length > PUBLIC_PATH_MAX) {
    return null;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  if (value.includes("..") || /[<>"']/.test(value)) {
    return null;
  }
  return value;
}

/** Persist logo / favicon public paths on SiteSettings. */
export async function saveStorefrontBrandAssets(input: {
  logoSrc?: string;
  logoHeightPx?: number;
  faviconSrc?: string;
  phone?: string;
  supportEmail?: string;
  storeName?: string;
  address?: string;
  actor?: BusinessActor;
}): Promise<BusinessMutationResult> {
  if (!usesDatabase()) {
    return fail(BUSINESS_DB_REQUIRED);
  }

  const data: {
    logoSrc?: string | null;
    logoHeightPx?: number;
    faviconSrc?: string | null;
    phone?: string | null;
    supportEmail?: string | null;
    storeName?: string;
    address?: string | null;
  } = {};

  if (input.logoSrc !== undefined) {
    const logoSrc = normalizePublicAssetPath(input.logoSrc);
    if (logoSrc == null) {
      return fail("Logo path must be a local public path.");
    }
    data.logoSrc = logoSrc || null;
  }
  if (input.logoHeightPx !== undefined) {
    // Clamped rather than rejected: the slider cannot produce an out-of-range
    // value, so anything outside it came from a hand-crafted request and the
    // useful response is a sane logo, not an error.
    data.logoHeightPx = clampLogoHeight(input.logoHeightPx);
  }
  if (input.faviconSrc !== undefined) {
    const faviconSrc = normalizePublicAssetPath(input.faviconSrc);
    if (faviconSrc == null) {
      return fail("Favicon path must be a local public path.");
    }
    data.faviconSrc = faviconSrc || null;
  }
  if (input.phone !== undefined) {
    const phone = normalizeOptionalText(input.phone, PHONE_MAX);
    if (phone == null) {
      return fail(`Phone must be ${PHONE_MAX} characters or fewer.`);
    }
    data.phone = phone || null;
  }
  if (input.supportEmail !== undefined) {
    const supportEmail = normalizeSupportEmail(input.supportEmail);
    if (supportEmail == null) {
      return fail("Enter a valid support email, or leave it blank.");
    }
    data.supportEmail = supportEmail || null;
  }
  if (input.storeName !== undefined) {
    const storeName = normalizeStoreName(input.storeName);
    if (storeName == null) {
      return fail(
        `Store name is required and must be ${STORE_NAME_MAX} characters or fewer.`,
      );
    }
    data.storeName = storeName;
  }
  if (input.address !== undefined) {
    const address = normalizeOptionalText(input.address, ADDRESS_MAX);
    if (address == null) {
      return fail(`Address must be ${ADDRESS_MAX} characters or fewer.`);
    }
    data.address = address || null;
  }

  if (Object.keys(data).length === 0) {
    return fail("Nothing to save.");
  }

  const existing = await getPrisma().siteSettings.findUnique({
    where: { id: "singleton" },
    select: { storeName: true },
  });

  const row = await getPrisma().siteSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      storeName: data.storeName ?? DEFAULT_BUSINESS_SETTINGS.storeName,
      phone: data.phone ?? null,
      supportEmail: data.supportEmail ?? null,
      address: data.address ?? null,
      logoSrc: data.logoSrc ?? null,
      faviconSrc: data.faviconSrc ?? null,
    },
    update: data,
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.BUSINESS_SETTINGS_UPDATE,
      entityType: "SiteSettings",
      entityId: row.id,
      metadata: {
        branding: true,
        fields: Object.keys(data),
        previousName: existing?.storeName ?? null,
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: row.id };
}
