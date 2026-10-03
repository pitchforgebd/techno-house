/**
 * Real static-content pages (AD-273) — About/Contact/FAQ/Support/Warranty/
 * Shipping/Returns/Terms. Body HTML is sanitized on every save (and again
 * at render time by the storefront, same as blog posts) — never trusted
 * as safe just because it came from the database.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

export const CONTENT_PAGE_SLUGS = [
  "about",
  "contact",
  "faq",
  "support",
  "warranty",
  "shipping",
  "returns",
  "terms",
  "privacy",
  "digital-commerce-guideline",
] as const;
export type ContentPageSlug = (typeof CONTENT_PAGE_SLUGS)[number];

export const CONTENT_PAGE_LABELS: Record<ContentPageSlug, string> = {
  about: "About us",
  contact: "Contact us",
  faq: "FAQ",
  support: "Support",
  warranty: "Warranty",
  shipping: "Shipping",
  returns: "Return Policy Page",
  terms: "Terms",
  privacy: "Privacy Policy",
  "digital-commerce-guideline": "ডিজিটাল কমার্স নির্দেশিকা ২০২১",
};

export type AdminContentPage = {
  slug: ContentPageSlug;
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  updatedAt: string | null;
};

export type StorefrontContentPage = {
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
};

export type ContentPageMutationResult =
  | { ok: true }
  | { ok: false; formError: string };

export type ContentPageActor = { staffId: string; email: string; ip?: string | null };

export function isContentPageSlug(value: string): value is ContentPageSlug {
  return (CONTENT_PAGE_SLUGS as readonly string[]).includes(value);
}

function emptyPage(slug: ContentPageSlug): AdminContentPage {
  return {
    slug,
    title: CONTENT_PAGE_LABELS[slug],
    body: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    updatedAt: null,
  };
}

function toAdmin(row: {
  slug: string;
  title: string;
  body: string;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string[];
  updatedAt: Date;
}): AdminContentPage {
  return {
    slug: isContentPageSlug(row.slug) ? row.slug : "about",
    title: row.title,
    body: row.body,
    metaTitle: row.metaTitle ?? "",
    metaDescription: row.metaDescription ?? "",
    metaKeywords: row.metaKeywords.join(", "),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getAdminContentPages(): Promise<AdminContentPage[]> {
  if (!usesDatabase()) {
    return CONTENT_PAGE_SLUGS.map(emptyPage);
  }
  const rows = await getPrisma().contentPage.findMany({
    where: { slug: { in: [...CONTENT_PAGE_SLUGS] } },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  return CONTENT_PAGE_SLUGS.map((slug) => {
    const row = bySlug.get(slug);
    return row ? toAdmin(row) : emptyPage(slug);
  });
}

export async function getAdminContentPage(
  slug: string,
): Promise<AdminContentPage | null> {
  if (!isContentPageSlug(slug)) {
    return null;
  }
  if (!usesDatabase()) {
    return emptyPage(slug);
  }
  const row = await getPrisma().contentPage.findUnique({ where: { slug } });
  return row ? toAdmin(row) : emptyPage(slug);
}

/** Real content for the live storefront page — null when nothing has been saved yet. */
export async function getStorefrontContentPage(
  slug: ContentPageSlug,
): Promise<StorefrontContentPage | null> {
  if (!usesDatabase()) {
    return null;
  }
  const row = await getPrisma().contentPage.findUnique({ where: { slug } });
  if (!row || !row.body.trim()) {
    return null;
  }
  return {
    title: row.title,
    body: row.body,
    metaTitle: row.metaTitle || row.title,
    metaDescription: row.metaDescription ?? "",
  };
}

const TITLE_MAX = 150;
const META_DESC_MAX = 300;
const BODY_MAX = 20000;
const MAX_KEYWORDS = 20;

export async function saveContentPage(input: {
  slug: string;
  title: string;
  body: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  actor?: ContentPageActor;
}): Promise<ContentPageMutationResult> {
  if (!usesDatabase()) {
    return { ok: false, formError: "Pages need the database. Turn off DATA_SOURCE=mock to save." };
  }
  if (!isContentPageSlug(input.slug)) {
    return { ok: false, formError: "Unknown page." };
  }
  const title = input.title.trim().slice(0, TITLE_MAX);
  if (!title) {
    return { ok: false, formError: "Enter a title." };
  }
  const body = sanitizeBlogBody(input.body).slice(0, BODY_MAX);
  const metaTitle = input.metaTitle.trim().slice(0, TITLE_MAX);
  const metaDescription = input.metaDescription.trim().slice(0, META_DESC_MAX);
  const metaKeywords = input.metaKeywords
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS);

  await getPrisma().contentPage.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      title,
      body,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      metaKeywords,
    },
    update: {
      title,
      body,
      metaTitle: metaTitle || null,
      metaDescription: metaDescription || null,
      metaKeywords,
    },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CONTENT_PAGE_UPDATE,
      entityType: "ContentPage",
      entityId: input.slug,
      ip: input.actor.ip,
      metadata: { slug: input.slug, title, bodyLength: body.length },
    });
  }
  return { ok: true };
}
