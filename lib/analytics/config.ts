/**
 * Public analytics / catalog ids (P15-T06 / P15-T07).
 *
 * Rows live on `AnalyticsConfiguration`. Only public ids are stored.
 * API tokens, CAPI tokens, and service-account JSON stay out of the
 * database. Raw custom scripts are not persisted (XSS).
 * `DATA_SOURCE=mock` keeps tags and feeds off.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  normalizeCatalogId,
  normalizeGa4Id,
  normalizeGa4PropertyId,
  normalizeGtmId,
  normalizeMerchantId,
  normalizePixelId,
  type AdminAnalyticsConfig,
  type AdminMerchantConfig,
  type AdminMetaConfig,
} from "@/lib/analytics/ids";
import { getPrisma } from "@/lib/db/prisma";
import type { AnalyticsProvider as DbAnalyticsProvider } from "@/lib/generated/prisma/enums";

export type {
  AdminAnalyticsConfig,
  AdminMerchantConfig,
  AdminMetaConfig,
} from "@/lib/analytics/ids";

export const ANALYTICS_DB_REQUIRED =
  "Analytics changes need the database. Turn off DATA_SOURCE=mock to save.";

export type AnalyticsMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type AnalyticsActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type StorefrontAnalyticsTags = {
  ga4Id: string | null;
  gtmId: string | null;
  pixelId: string | null;
};

const EMPTY_GA4: AdminAnalyticsConfig = {
  provider: "GA4",
  isEnabled: false,
  publicId: "",
  propertyId: "",
};

const EMPTY_GTM: AdminAnalyticsConfig = {
  provider: "GTM",
  isEnabled: false,
  publicId: "",
  propertyId: "",
};

const EMPTY_META: AdminMetaConfig = {
  isEnabled: false,
  publicId: "",
  catalogId: "",
};

const EMPTY_MERCHANT: AdminMerchantConfig = {
  isEnabled: false,
  publicId: "",
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): AnalyticsMutationResult {
  return { ok: false, formError };
}

function toAdminConfig(row: {
  provider: DbAnalyticsProvider;
  isEnabled: boolean;
  publicId: string | null;
  notes: string | null;
}): AdminAnalyticsConfig {
  return {
    provider: row.provider === "GTM" ? "GTM" : "GA4",
    isEnabled: row.isEnabled,
    publicId: row.publicId ?? "",
    propertyId: row.notes ?? "",
  };
}

export async function getAdminAnalyticsConfig(
  provider: "GA4" | "GTM",
): Promise<AdminAnalyticsConfig> {
  if (!usesDatabase()) {
    return provider === "GTM" ? EMPTY_GTM : EMPTY_GA4;
  }
  const row = await getPrisma().analyticsConfiguration.findUnique({
    where: { provider },
    select: {
      provider: true,
      isEnabled: true,
      publicId: true,
      notes: true,
    },
  });
  if (!row) {
    return provider === "GTM" ? EMPTY_GTM : EMPTY_GA4;
  }
  return toAdminConfig(row);
}

export async function getAdminMetaConfig(): Promise<AdminMetaConfig> {
  if (!usesDatabase()) {
    return EMPTY_META;
  }
  const row = await getPrisma().analyticsConfiguration.findUnique({
    where: { provider: "META_PIXEL" },
    select: { isEnabled: true, publicId: true, notes: true },
  });
  if (!row) {
    return EMPTY_META;
  }
  return {
    isEnabled: row.isEnabled,
    publicId: row.publicId ?? "",
    catalogId: row.notes ?? "",
  };
}

export async function getAdminMerchantConfig(): Promise<AdminMerchantConfig> {
  if (!usesDatabase()) {
    return EMPTY_MERCHANT;
  }
  const row = await getPrisma().analyticsConfiguration.findUnique({
    where: { provider: "MERCHANT_CENTER" },
    select: { isEnabled: true, publicId: true },
  });
  if (!row) {
    return EMPTY_MERCHANT;
  }
  return {
    isEnabled: row.isEnabled,
    publicId: row.publicId ?? "",
  };
}

export async function getStorefrontAnalyticsTags(): Promise<StorefrontAnalyticsTags> {
  if (!usesDatabase()) {
    return { ga4Id: null, gtmId: null, pixelId: null };
  }
  const rows = await getPrisma().analyticsConfiguration.findMany({
    where: {
      provider: { in: ["GA4", "GTM", "META_PIXEL"] },
      isEnabled: true,
    },
    select: { provider: true, publicId: true },
  });
  let ga4Id: string | null = null;
  let gtmId: string | null = null;
  let pixelId: string | null = null;
  for (const row of rows) {
    if (row.provider === "GA4") {
      ga4Id = normalizeGa4Id(row.publicId ?? "") || null;
    }
    if (row.provider === "GTM") {
      gtmId = normalizeGtmId(row.publicId ?? "") || null;
    }
    if (row.provider === "META_PIXEL") {
      pixelId = normalizePixelId(row.publicId ?? "") || null;
    }
  }
  if (gtmId) {
    return { ga4Id: null, gtmId, pixelId: null };
  }
  return { ga4Id, gtmId: null, pixelId };
}

export async function saveGa4Config(input: {
  isEnabled: boolean;
  publicId: string;
  propertyId: string;
  actor?: AnalyticsActor;
}): Promise<AnalyticsMutationResult> {
  if (!usesDatabase()) {
    return fail(ANALYTICS_DB_REQUIRED);
  }
  const publicId = normalizeGa4Id(input.publicId);
  if (publicId == null) {
    return fail("Enter a valid GA4 measurement ID (G-XXXXXXXX).");
  }
  const propertyId = normalizeGa4PropertyId(input.propertyId);
  if (propertyId == null) {
    return fail("Property ID must be digits only.");
  }
  if (input.isEnabled && !publicId) {
    return fail("Turn on GA4 only after entering a measurement ID.");
  }

  const row = await getPrisma().analyticsConfiguration.upsert({
    where: { provider: "GA4" },
    create: {
      provider: "GA4",
      isEnabled: input.isEnabled,
      publicId: publicId || null,
      notes: propertyId || null,
    },
    update: {
      isEnabled: input.isEnabled,
      publicId: publicId || null,
      notes: propertyId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ANALYTICS_UPDATE,
      entityType: "AnalyticsConfiguration",
      entityId: row.id,
      metadata: { provider: "GA4", isEnabled: input.isEnabled },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}

export async function saveGtmConfig(input: {
  isEnabled: boolean;
  publicId: string;
  actor?: AnalyticsActor;
}): Promise<AnalyticsMutationResult> {
  if (!usesDatabase()) {
    return fail(ANALYTICS_DB_REQUIRED);
  }
  const publicId = normalizeGtmId(input.publicId);
  if (publicId == null) {
    return fail("Enter a valid GTM container ID (GTM-XXXXXXX).");
  }
  if (input.isEnabled && !publicId) {
    return fail("Turn on GTM only after entering a container ID.");
  }

  const row = await getPrisma().analyticsConfiguration.upsert({
    where: { provider: "GTM" },
    create: {
      provider: "GTM",
      isEnabled: input.isEnabled,
      publicId: publicId || null,
    },
    update: {
      isEnabled: input.isEnabled,
      publicId: publicId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ANALYTICS_UPDATE,
      entityType: "AnalyticsConfiguration",
      entityId: row.id,
      metadata: { provider: "GTM", isEnabled: input.isEnabled },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}

export async function saveMetaPixelConfig(input: {
  isEnabled: boolean;
  publicId: string;
  actor?: AnalyticsActor;
}): Promise<AnalyticsMutationResult> {
  if (!usesDatabase()) {
    return fail(ANALYTICS_DB_REQUIRED);
  }
  const publicId = normalizePixelId(input.publicId);
  if (publicId == null) {
    return fail("Enter a valid Meta Pixel ID (digits only).");
  }
  if (input.isEnabled && !publicId) {
    return fail("Turn on Meta Pixel only after entering a Pixel ID.");
  }

  const existing = await getPrisma().analyticsConfiguration.findUnique({
    where: { provider: "META_PIXEL" },
    select: { notes: true },
  });

  const row = await getPrisma().analyticsConfiguration.upsert({
    where: { provider: "META_PIXEL" },
    create: {
      provider: "META_PIXEL",
      isEnabled: input.isEnabled,
      publicId: publicId || null,
      notes: existing?.notes ?? null,
    },
    update: {
      isEnabled: input.isEnabled,
      publicId: publicId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ANALYTICS_UPDATE,
      entityType: "AnalyticsConfiguration",
      entityId: row.id,
      metadata: { provider: "META_PIXEL", isEnabled: input.isEnabled },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}

export async function saveFacebookCatalogId(input: {
  catalogId: string;
  actor?: AnalyticsActor;
}): Promise<AnalyticsMutationResult> {
  if (!usesDatabase()) {
    return fail(ANALYTICS_DB_REQUIRED);
  }
  const catalogId = normalizeCatalogId(input.catalogId);
  if (catalogId == null) {
    return fail("Catalog ID must be digits only.");
  }

  const existing = await getPrisma().analyticsConfiguration.findUnique({
    where: { provider: "META_PIXEL" },
    select: { isEnabled: true, publicId: true },
  });

  const row = await getPrisma().analyticsConfiguration.upsert({
    where: { provider: "META_PIXEL" },
    create: {
      provider: "META_PIXEL",
      isEnabled: existing?.isEnabled ?? false,
      publicId: existing?.publicId ?? null,
      notes: catalogId || null,
    },
    update: {
      notes: catalogId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ANALYTICS_UPDATE,
      entityType: "AnalyticsConfiguration",
      entityId: row.id,
      metadata: { provider: "META_PIXEL", catalogId: Boolean(catalogId) },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}

export async function saveMerchantCenterConfig(input: {
  isEnabled: boolean;
  publicId: string;
  actor?: AnalyticsActor;
}): Promise<AnalyticsMutationResult> {
  if (!usesDatabase()) {
    return fail(ANALYTICS_DB_REQUIRED);
  }
  const publicId = normalizeMerchantId(input.publicId);
  if (publicId == null) {
    return fail("Enter a valid Merchant ID (digits only).");
  }
  if (input.isEnabled && !publicId) {
    return fail("Turn on Merchant Center only after entering a Merchant ID.");
  }

  const row = await getPrisma().analyticsConfiguration.upsert({
    where: { provider: "MERCHANT_CENTER" },
    create: {
      provider: "MERCHANT_CENTER",
      isEnabled: input.isEnabled,
      publicId: publicId || null,
    },
    update: {
      isEnabled: input.isEnabled,
      publicId: publicId || null,
    },
    select: { id: true },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ANALYTICS_UPDATE,
      entityType: "AnalyticsConfiguration",
      entityId: row.id,
      metadata: { provider: "MERCHANT_CENTER", isEnabled: input.isEnabled },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}
