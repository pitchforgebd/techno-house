/**
 * Global SEO defaults (P15-T08).
 *
 * One `SEOConfiguration` row with `path = null` is the site-wide default.
 * Per-path rows are unused. OG image / custom scripts are not persisted.
 * `DATA_SOURCE=mock` refuses writes and keeps storefront fallbacks.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import {
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  SEO_DESCRIPTION_MAX,
  SEO_TITLE_MAX,
  keywordsToInput,
  normalizeSeoDescription,
  normalizeSeoKeywords,
  normalizeSeoTitle,
  type AdminSeoConfig,
} from "@/lib/seo/fields";

export type { AdminSeoConfig } from "@/lib/seo/fields";

export const SEO_DB_REQUIRED =
  "SEO changes need the database. Turn off DATA_SOURCE=mock to save.";

export type SeoMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type SeoActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type StorefrontSeoMetadata = {
  title: string;
  description: string;
  keywords: string[] | undefined;
};

const EMPTY_ADMIN: AdminSeoConfig = {
  title: "",
  description: "",
  keywords: "",
  updatedAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): SeoMutationResult {
  return { ok: false, formError };
}

export async function getAdminSeoConfig(): Promise<AdminSeoConfig> {
  if (!usesDatabase()) {
    return EMPTY_ADMIN;
  }
  const row = await getPrisma().sEOConfiguration.findFirst({
    where: { path: null },
    select: {
      title: true,
      description: true,
      keywords: true,
      updatedAt: true,
    },
  });
  if (!row) {
    return EMPTY_ADMIN;
  }
  return {
    title: row.title ?? "",
    description: row.description ?? "",
    keywords: keywordsToInput(row.keywords),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getStorefrontSeoMetadata(): Promise<StorefrontSeoMetadata> {
  if (!usesDatabase()) {
    return {
      title: DEFAULT_SEO_TITLE,
      description: DEFAULT_SEO_DESCRIPTION,
      keywords: undefined,
    };
  }
  const row = await getPrisma().sEOConfiguration.findFirst({
    where: { path: null },
    select: { title: true, description: true, keywords: true },
  });
  const title = row?.title?.trim() || DEFAULT_SEO_TITLE;
  const description = row?.description?.trim() || DEFAULT_SEO_DESCRIPTION;
  const keywords = row?.keywords.filter(Boolean) ?? [];
  return {
    title,
    description,
    keywords: keywords.length ? keywords : undefined,
  };
}

export async function saveGlobalSeo(input: {
  title: string;
  description: string;
  keywords: string;
  actor?: SeoActor;
}): Promise<SeoMutationResult> {
  if (!usesDatabase()) {
    return fail(SEO_DB_REQUIRED);
  }
  const title = normalizeSeoTitle(input.title);
  if (title == null) {
    return fail(`Meta title must be ${SEO_TITLE_MAX} characters or fewer.`);
  }
  const description = normalizeSeoDescription(input.description);
  if (description == null) {
    return fail(
      `Meta description must be ${SEO_DESCRIPTION_MAX} characters or fewer.`,
    );
  }
  const keywords = normalizeSeoKeywords(input.keywords);
  if (keywords == null) {
    return fail("Enter up to 24 keywords, each 40 characters or fewer.");
  }

  const existing = await getPrisma().sEOConfiguration.findFirst({
    where: { path: null },
    select: { id: true },
  });

  const row = existing
    ? await getPrisma().sEOConfiguration.update({
        where: { id: existing.id },
        data: {
          title: title || null,
          description: description || null,
          keywords,
        },
        select: { id: true },
      })
    : await getPrisma().sEOConfiguration.create({
        data: {
          path: null,
          title: title || null,
          description: description || null,
          keywords,
        },
        select: { id: true },
      });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.SEO_UPDATE,
      entityType: "SEOConfiguration",
      entityId: row.id,
      metadata: { hasTitle: Boolean(title), keywordCount: keywords.length },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: row.id };
}
