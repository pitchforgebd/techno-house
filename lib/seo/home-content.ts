/**
 * Admin-managed SEO copy for the bottom of the homepage.
 *
 * Server only. This is the block every Bangladeshi tech retailer runs under
 * the product rails — StarTech, Ryans and Dazzle all close the homepage with
 * a few hundred words of headed, heavily internally-linked copy. It is the
 * page's main indexable prose, so it has to be editable without a deploy.
 *
 * Stored as sanitized HTML on the `SEOConfiguration` row for path "/". The
 * site-wide defaults row (path `null`) keeps carrying only the `<head>`
 * fields, so meta and on-page copy stay separable.
 *
 * With nothing saved the homepage keeps its built-in "About Techno House"
 * block, so adopting admin-managed copy is opt-in rather than a blank space.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  sanitizeBlogBody,
  sanitizeRichBody,
} from "@/lib/content/sanitize-html";
import { getPrisma } from "@/lib/db/prisma";

/** The `SEOConfiguration.path` value that owns the homepage block. */
const HOME_SEO_PATH = "/";

/** Roughly 12-15 printed pages — far beyond what this block needs. */
export const HOME_SEO_HTML_MAX = 60_000;

export type HomeSeoResult = { ok: true } | { ok: false; formError: string };

export type HomeSeoActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function getHomeSeoHtml(): Promise<string> {
  if (!usesDatabase()) {
    return "";
  }
  const row = await getPrisma().sEOConfiguration.findUnique({
    where: { path: HOME_SEO_PATH },
    select: { contentHtml: true },
  });
  // Sanitized again at read time — stored HTML is never trusted just
  // because it was clean when it was written.
  return row?.contentHtml ? sanitizeBlogBody(row.contentHtml) : "";
}

export async function saveHomeSeoHtml(input: {
  html: string;
  actor?: HomeSeoActor;
}): Promise<HomeSeoResult> {
  if (!usesDatabase()) {
    return {
      ok: false,
      formError:
        "Homepage content needs the database. Turn off DATA_SOURCE=mock to save.",
    };
  }

  const cleaned = sanitizeRichBody(input.html, {
    maxLength: HOME_SEO_HTML_MAX,
    tooLongError: "That homepage content is too long.",
  });
  if (!cleaned.ok) {
    return cleaned;
  }

  const row = await getPrisma().sEOConfiguration.upsert({
    where: { path: HOME_SEO_PATH },
    create: { path: HOME_SEO_PATH, keywords: [], contentHtml: cleaned.value },
    update: { contentHtml: cleaned.value },
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
      ip: input.actor.ip,
      metadata: {
        path: HOME_SEO_PATH,
        field: "contentHtml",
        length: cleaned.value?.length ?? 0,
      },
    });
  }
  return { ok: true };
}
