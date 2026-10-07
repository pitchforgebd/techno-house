/**
 * Real homepage promotional banners (AD-272) — replaces the previously
 * hardcoded demo content in lib/catalog/promo-banners.ts. Images upload
 * through the same real admin media pipeline (lib/media/admin-media.ts)
 * every other real image upload in this app uses.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { checkStorefrontLink } from "@/lib/design/storefront-link";
import { usesDatabase } from "@/lib/runtime/data-source";

export const HOME_BANNER_DB_REQUIRED =
  "Banners need the database. Turn off DATA_SOURCE=mock to save.";

export const HOME_BANNER_SLOTS = [
  "hero",
  "hero-side",
  "flash-wide",
  "promo-tile",
  "category",
  /** Strip under the buy box on every product page — the campaign/cashback
   * banner slot (bKash offers and the like). */
  "product-page",
] as const;
export type HomeBannerSlot = (typeof HOME_BANNER_SLOTS)[number];

export type AdminHomeBanner = {
  id: string;
  slot: HomeBannerSlot;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  position: number;
  isActive: boolean;
};

export type StorefrontHomeBanner = {
  id: string;
  slot: HomeBannerSlot;
  eyebrow: string;
  title: string;
  text?: string;
  cta: string;
  href: string;
  image: string;
  imageAlt: string;
};

export type HomeBannerMutationResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

export type HomeBannerActor = { staffId: string; email: string; ip?: string | null };

function fail(formError: string): HomeBannerMutationResult {
  return { ok: false, formError };
}

function isSlot(value: string): value is HomeBannerSlot {
  return (HOME_BANNER_SLOTS as readonly string[]).includes(value);
}

function toAdmin(row: {
  id: string;
  slot: string;
  eyebrow: string;
  title: string;
  text: string | null;
  cta: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  position: number;
  isActive: boolean;
}): AdminHomeBanner {
  return {
    id: row.id,
    slot: isSlot(row.slot) ? row.slot : "promo-tile",
    eyebrow: row.eyebrow,
    title: row.title,
    text: row.text ?? "",
    cta: row.cta,
    href: row.href,
    imageSrc: row.imageSrc,
    imageAlt: row.imageAlt,
    position: row.position,
    isActive: row.isActive,
  };
}

export async function getAdminHomeBanners(): Promise<AdminHomeBanner[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().homeBanner.findMany({
    orderBy: [{ slot: "asc" }, { position: "asc" }],
  });
  return rows.map(toAdmin);
}

/** Real, active-only, ordered — exactly what the live storefront renders for a slot. */
export async function getStorefrontHomeBanners(
  slot: HomeBannerSlot,
): Promise<StorefrontHomeBanner[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().homeBanner.findMany({
    where: { slot, isActive: true },
    orderBy: { position: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    slot,
    eyebrow: row.eyebrow,
    title: row.title,
    text: row.text ?? undefined,
    cta: row.cta,
    href: row.href,
    image: row.imageSrc,
    imageAlt: row.imageAlt,
  }));
}

const TEXT_MAX = 200;
const HREF_MAX = 300;

function sanitizeText(value: string, max: number): string {
  return value.trim().replace(/[<>]/g, "").slice(0, max);
}

/** Whether the product, category or brand a banner link names exists. */
async function storefrontSlugExists(
  kind: "product" | "category" | "brand",
  slug: string,
): Promise<boolean> {
  const prisma = getPrisma();
  const where = { slug };
  const select = { id: true } as const;
  const row =
    kind === "product"
      ? await prisma.product.findFirst({ where, select })
      : kind === "category"
        ? await prisma.category.findFirst({ where, select })
        : await prisma.brand.findFirst({ where, select });
  return row !== null;
}

export async function saveHomeBanner(input: {
  id?: string;
  slot: string;
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  position: number;
  isActive: boolean;
  actor?: HomeBannerActor;
}): Promise<HomeBannerMutationResult> {
  if (!usesDatabase()) {
    return fail(HOME_BANNER_DB_REQUIRED);
  }
  if (!isSlot(input.slot)) {
    return fail("Choose a valid banner placement.");
  }
  const title = sanitizeText(input.title, TEXT_MAX);
  const eyebrow = sanitizeText(input.eyebrow, TEXT_MAX);
  const cta = sanitizeText(input.cta, TEXT_MAX);
  const text = sanitizeText(input.text, TEXT_MAX);
  const imageAlt = sanitizeText(input.imageAlt, TEXT_MAX);
  const href = input.href.trim().slice(0, HREF_MAX);
  const imageSrc = input.imageSrc.trim();

  if (!title) return fail("Enter a title.");
  if (!cta) return fail("Enter a call-to-action label.");
  if (!href) return fail("Enter a link, like /shop or /category/laptops.");
  // The link must lead to a page that exists. Three banners were once saved with
  // links like "/DHFH"; every visitor's browser then logged a 404 for each (AD-368).
  const link = checkStorefrontLink(href);
  if (!link.ok) return fail(link.message);
  if (link.kind && link.slug && !(await storefrontSlugExists(link.kind, link.slug))) {
    return fail(`There is no ${link.kind} "${link.slug}" on the store — check the link.`);
  }
  if (!imageSrc) return fail("Upload an image first.");

  const data = {
    slot: input.slot,
    eyebrow,
    title,
    text: text || null,
    cta,
    href,
    imageSrc,
    imageAlt: imageAlt || title,
    position: Number.isFinite(input.position) ? input.position : 0,
    isActive: input.isActive,
  };

  const row = input.id
    ? await getPrisma().homeBanner.update({ where: { id: input.id }, data, select: { id: true } })
    : await getPrisma().homeBanner.create({ data, select: { id: true } });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.HOME_BANNER_UPDATE,
      entityType: "HomeBanner",
      entityId: row.id,
      ip: input.actor.ip,
      metadata: { slot: input.slot, title },
    });
  }
  return { ok: true, id: row.id };
}

export async function deleteHomeBanner(
  id: string,
  actor?: HomeBannerActor,
): Promise<HomeBannerMutationResult> {
  if (!usesDatabase()) {
    return fail(HOME_BANNER_DB_REQUIRED);
  }
  const existing = await getPrisma().homeBanner.findUnique({ where: { id }, select: { slot: true, title: true } });
  if (!existing) {
    return fail("That banner no longer exists.");
  }
  await getPrisma().homeBanner.delete({ where: { id } });

  if (actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: actor.staffId,
      actorLabel: actor.email,
      action: AUDIT_ACTIONS.HOME_BANNER_DELETE,
      entityType: "HomeBanner",
      entityId: id,
      ip: actor.ip,
      metadata: { slot: existing.slot, title: existing.title },
    });
  }
  return { ok: true, id };
}
