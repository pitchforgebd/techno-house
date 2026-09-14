/**
 * Admin category persistence (P12-T01).
 *
 * Storefront reads stay on CategoryRepository (active rows only). These
 * helpers include inactive categories and write to PostgreSQL.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  parseCategoryInput,
  type CategoryInputFields,
  type ParsedCategoryInput,
} from "@/lib/catalog/category-input";
import { sanitizeCategorySeoHtml } from "@/lib/catalog/category-seo-content";
import { getPrisma } from "@/lib/db/prisma";

export const CATALOG_DB_REQUIRED =
  "Category changes need the database. Turn off DATA_SOURCE=mock to save.";

export type CategoryMutationResult =
  { ok: true; slug: string } | { ok: false; formError: string };

export type CategoryActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type AdminCategoryRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  parentSlug: string | null;
  parentName: string | null;
  filterKeys: string[];
  position: number;
  isActive: boolean;
  iconSrc: string | null;
  bannerSrc: string | null;
  coverSrc: string | null;
  productCount: number;
  childCount: number;
  isFeatured: boolean;
  isHot: boolean;
};

const ADMIN_CATEGORY_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  filterKeys: true,
  position: true,
  isActive: true,
  isFeatured: true,
  isHot: true,
  iconSrc: true,
  bannerSrc: true,
  coverSrc: true,
  parent: { select: { slug: true, name: true } },
  _count: { select: { products: true, children: true } },
} as const;

function mapRecord(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  filterKeys: string[];
  position: number;
  isActive: boolean;
  isFeatured: boolean;
  isHot: boolean;
  iconSrc: string | null;
  bannerSrc: string | null;
  coverSrc: string | null;
  parent: { slug: string; name: string } | null;
  _count: { products: number; children: number };
}): AdminCategoryRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    parentSlug: row.parent?.slug ?? null,
    parentName: row.parent?.name ?? null,
    filterKeys: row.filterKeys,
    position: row.position,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    isHot: row.isHot,
    iconSrc: row.iconSrc,
    bannerSrc: row.bannerSrc,
    coverSrc: row.coverSrc,
    productCount: row._count.products,
    childCount: row._count.children,
  };
}

export function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

export async function listAdminCategoryRecords(): Promise<
  AdminCategoryRecord[]
> {
  const rows = await getPrisma().category.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: ADMIN_CATEGORY_SELECT,
  });
  return rows.map(mapRecord);
}

export async function getAdminCategoryRecord(
  slug: string,
): Promise<AdminCategoryRecord | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().category.findUnique({
    where: { slug: trimmed },
    select: ADMIN_CATEGORY_SELECT,
  });
  return row ? mapRecord(row) : null;
}

async function resolveParentId(
  parentSlug: string | null,
): Promise<
  { ok: true; parentId: string | null } | { ok: false; formError: string }
> {
  if (!parentSlug) {
    return { ok: true, parentId: null };
  }
  const parent = await getPrisma().category.findUnique({
    where: { slug: parentSlug },
    select: { id: true },
  });
  if (!parent) {
    return { ok: false, formError: "That parent category does not exist." };
  }
  return { ok: true, parentId: parent.id };
}

async function wouldCreateCycle(
  categoryId: string,
  parentId: string | null,
): Promise<boolean> {
  if (!parentId) {
    return false;
  }
  if (parentId === categoryId) {
    return true;
  }
  const prisma = getPrisma();
  const seen = new Set<string>();
  let current: string | null = parentId;
  while (current) {
    if (current === categoryId) {
      return true;
    }
    if (seen.has(current)) {
      return true;
    }
    seen.add(current);
    const row: { parentId: string | null } | null =
      await prisma.category.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
    current = row?.parentId ?? null;
  }
  return false;
}

async function recordCategoryAudit(
  actor: CategoryActor | undefined,
  action: string,
  record: { id: string; slug: string; name: string },
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType: "Category",
    entityId: record.id,
    ip: actor.ip,
    metadata: { slug: record.slug, name: record.name, ...metadata },
  });
}

async function persistParsed(
  parsed: ParsedCategoryInput,
  currentSlug: string | undefined,
  actor?: CategoryActor,
): Promise<CategoryMutationResult> {
  const prisma = getPrisma();
  const parent = await resolveParentId(parsed.parentSlug);
  if (!parent.ok) {
    return parent;
  }

  // The editor's HTML is never trusted: the allowlist runs here, on the
  // server, whatever the client sent.
  let seoContentHtml: string | null | undefined;
  if (parsed.seoContentHtml !== undefined) {
    const cleaned = sanitizeCategorySeoHtml(parsed.seoContentHtml);
    if (!cleaned.ok) {
      return cleaned;
    }
    seoContentHtml = cleaned.value;
  }

  const slugTaken = await prisma.category.findUnique({
    where: { slug: parsed.slug },
    select: { id: true, slug: true },
  });

  if (currentSlug) {
    const existing = await prisma.category.findUnique({
      where: { slug: currentSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!existing) {
      return { ok: false, formError: "That category no longer exists." };
    }
    if (slugTaken && slugTaken.id !== existing.id) {
      return { ok: false, formError: "That URL slug is already in use." };
    }
    if (await wouldCreateCycle(existing.id, parent.parentId)) {
      return {
        ok: false,
        formError: "That parent would create a cycle in the category tree.",
      };
    }

    await prisma.category.update({
      where: { id: existing.id },
      data: {
        slug: parsed.slug,
        name: parsed.name,
        description: parsed.description,
        parentId: parent.parentId,
        filterKeys: parsed.filterKeys,
        position: parsed.position,
        isActive: parsed.isActive,
        ...(parsed.iconSrc !== undefined ? { iconSrc: parsed.iconSrc } : {}),
        ...(parsed.bannerSrc !== undefined
          ? { bannerSrc: parsed.bannerSrc }
          : {}),
        ...(parsed.coverSrc !== undefined ? { coverSrc: parsed.coverSrc } : {}),
        ...(seoContentHtml !== undefined ? { seoContentHtml } : {}),
      },
    });

    await recordCategoryAudit(actor, AUDIT_ACTIONS.CATEGORY_UPDATE, existing, {
      slug: parsed.slug,
      parentSlug: parsed.parentSlug,
      isActive: parsed.isActive,
    });
    return { ok: true, slug: parsed.slug };
  }

  if (slugTaken) {
    return { ok: false, formError: "That URL slug is already in use." };
  }

  const created = await prisma.category.create({
    data: {
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description,
      parentId: parent.parentId,
      filterKeys: parsed.filterKeys,
      position: parsed.position,
      isActive: parsed.isActive,
      iconSrc: parsed.iconSrc ?? null,
      bannerSrc: parsed.bannerSrc ?? null,
      coverSrc: parsed.coverSrc ?? null,
      seoContentHtml: seoContentHtml ?? null,
    },
    select: { id: true, slug: true, name: true },
  });

  await recordCategoryAudit(actor, AUDIT_ACTIONS.CATEGORY_CREATE, created, {
    parentSlug: parsed.parentSlug,
    isActive: parsed.isActive,
  });
  return { ok: true, slug: created.slug };
}

export async function saveAdminCategory(input: {
  currentSlug?: string;
  fields: CategoryInputFields;
  actor?: CategoryActor;
}): Promise<CategoryMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CATALOG_DB_REQUIRED };
  }
  const parsed = parseCategoryInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }
  return persistParsed(parsed.value, input.currentSlug, input.actor);
}

/**
 * Real featured/hot flags (Phase 4) — the admin table previously derived
 * these from a hash of the category slug (`hashOrder(slug) > 28`, or a
 * hardcoded `slug === "laptops"`), not real data, and every toggle was a
 * `notifySuccess("… updated (mock)")` with no write at all.
 *
 * Persisted only — no storefront section reads either flag yet; see
 * TASK_STATE.md.
 */
export async function setCategoryFeatured(input: {
  slug: string;
  isFeatured: boolean;
  actor?: CategoryActor;
}): Promise<CategoryMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CATALOG_DB_REQUIRED };
  }
  const existing = await getPrisma().category.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That category no longer exists." };
  }
  await getPrisma().category.update({
    where: { id: existing.id },
    data: { isFeatured: input.isFeatured },
  });
  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CATEGORY_FEATURED_UPDATE,
      entityType: "Category",
      entityId: existing.id,
      ip: input.actor.ip,
      metadata: { slug: input.slug, isFeatured: input.isFeatured },
    });
  }
  return { ok: true, slug: input.slug };
}

export async function setCategoryHot(input: {
  slug: string;
  isHot: boolean;
  actor?: CategoryActor;
}): Promise<CategoryMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CATALOG_DB_REQUIRED };
  }
  const existing = await getPrisma().category.findUnique({
    where: { slug: input.slug },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That category no longer exists." };
  }
  await getPrisma().category.update({
    where: { id: existing.id },
    data: { isHot: input.isHot },
  });
  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.CATEGORY_HOT_UPDATE,
      entityType: "Category",
      entityId: existing.id,
      ip: input.actor.ip,
      metadata: { slug: input.slug, isHot: input.isHot },
    });
  }
  return { ok: true, slug: input.slug };
}

export async function deleteAdminCategory(input: {
  slug: string;
  actor?: CategoryActor;
}): Promise<CategoryMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CATALOG_DB_REQUIRED };
  }
  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false, formError: "That category no longer exists." };
  }

  const existing = await getPrisma().category.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { products: true, children: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That category no longer exists." };
  }
  if (existing._count.products > 0) {
    return {
      ok: false,
      formError:
        "Move or reassign products in this category before deleting it.",
    };
  }
  if (existing._count.children > 0) {
    return {
      ok: false,
      formError: "Reassign or delete subcategories before deleting this one.",
    };
  }

  await getPrisma().category.delete({ where: { id: existing.id } });
  await recordCategoryAudit(
    input.actor,
    AUDIT_ACTIONS.CATEGORY_DELETE,
    existing,
    {},
  );
  return { ok: true, slug: existing.slug };
}
