/**
 * Admin brand persistence (P12-T02).
 *
 * Storefront reads stay on BrandRepository (active rows only). These
 * helpers include inactive brands and write to PostgreSQL.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  parseBrandInput,
  type BrandInputFields,
  type ParsedBrandInput,
} from "@/lib/catalog/brand-input";
import { getPrisma } from "@/lib/db/prisma";

export const BRAND_DB_REQUIRED =
  "Brand changes need the database. Turn off DATA_SOURCE=mock to save.";

export type BrandMutationResult =
  { ok: true; slug: string } | { ok: false; formError: string };

export type BrandActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type AdminBrandRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logoSrc: string | null;
  position: number;
  isActive: boolean;
  createdAt: Date;
  productCount: number;
  categories: { slug: string; name: string }[];
};

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

async function recordBrandAudit(
  actor: BrandActor | undefined,
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
    entityType: "Brand",
    entityId: record.id,
    ip: actor.ip,
    metadata: { slug: record.slug, name: record.name, ...metadata },
  });
}

function uniqueCategories(
  products: { category: { slug: string; name: string } }[],
): { slug: string; name: string }[] {
  const seen = new Set<string>();
  const categories: { slug: string; name: string }[] = [];
  for (const product of products) {
    if (seen.has(product.category.slug)) {
      continue;
    }
    seen.add(product.category.slug);
    categories.push(product.category);
  }
  return categories.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listAdminBrandRecords(): Promise<AdminBrandRecord[]> {
  const rows = await getPrisma().brand.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      logoSrc: true,
      position: true,
      isActive: true,
      createdAt: true,
      _count: { select: { products: true } },
      products: {
        select: { category: { select: { slug: true, name: true } } },
      },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logoSrc: row.logoSrc,
    position: row.position,
    isActive: row.isActive,
    createdAt: row.createdAt,
    productCount: row._count.products,
    categories: uniqueCategories(row.products),
  }));
}

export async function getAdminBrandRecord(
  slug: string,
): Promise<AdminBrandRecord | null> {
  const trimmed = slug.trim();
  if (!trimmed) {
    return null;
  }
  const rows = await listAdminBrandRecords();
  return rows.find((row) => row.slug === trimmed) ?? null;
}

async function persistParsed(
  parsed: ParsedBrandInput,
  currentSlug: string | undefined,
  actor?: BrandActor,
): Promise<BrandMutationResult> {
  const prisma = getPrisma();
  const slugTaken = await prisma.brand.findUnique({
    where: { slug: parsed.slug },
    select: { id: true },
  });

  if (currentSlug) {
    const existing = await prisma.brand.findUnique({
      where: { slug: currentSlug },
      select: { id: true, slug: true, name: true },
    });
    if (!existing) {
      return { ok: false, formError: "That brand no longer exists." };
    }
    if (slugTaken && slugTaken.id !== existing.id) {
      return { ok: false, formError: "That URL slug is already in use." };
    }

    await prisma.brand.update({
      where: { id: existing.id },
      data: {
        slug: parsed.slug,
        name: parsed.name,
        description: parsed.description,
        position: parsed.position,
        isActive: parsed.isActive,
        ...(parsed.logoSrc !== undefined ? { logoSrc: parsed.logoSrc } : {}),
      },
    });

    await recordBrandAudit(actor, AUDIT_ACTIONS.BRAND_UPDATE, existing, {
      slug: parsed.slug,
      isActive: parsed.isActive,
      hasLogo:
        parsed.logoSrc !== undefined ? Boolean(parsed.logoSrc) : undefined,
    });
    return { ok: true, slug: parsed.slug };
  }

  if (slugTaken) {
    return { ok: false, formError: "That URL slug is already in use." };
  }

  const created = await prisma.brand.create({
    data: {
      slug: parsed.slug,
      name: parsed.name,
      description: parsed.description,
      position: parsed.position,
      isActive: parsed.isActive,
      logoSrc: parsed.logoSrc ?? null,
    },
    select: { id: true, slug: true, name: true },
  });

  await recordBrandAudit(actor, AUDIT_ACTIONS.BRAND_CREATE, created, {
    isActive: parsed.isActive,
    hasLogo: Boolean(parsed.logoSrc),
  });
  return { ok: true, slug: created.slug };
}

export async function saveAdminBrand(input: {
  currentSlug?: string;
  fields: BrandInputFields;
  actor?: BrandActor;
}): Promise<BrandMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: BRAND_DB_REQUIRED };
  }
  const parsed = parseBrandInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }
  return persistParsed(parsed.value, input.currentSlug, input.actor);
}

export async function deleteAdminBrand(input: {
  slug: string;
  actor?: BrandActor;
}): Promise<BrandMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: BRAND_DB_REQUIRED };
  }
  const slug = input.slug.trim();
  if (!slug) {
    return { ok: false, formError: "That brand no longer exists." };
  }

  const existing = await getPrisma().brand.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      _count: { select: { products: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That brand no longer exists." };
  }
  if (existing._count.products > 0) {
    return {
      ok: false,
      formError: "Move or reassign products in this brand before deleting it.",
    };
  }

  await getPrisma().brand.delete({ where: { id: existing.id } });
  await recordBrandAudit(input.actor, AUDIT_ACTIONS.BRAND_DELETE, existing, {});
  return { ok: true, slug: existing.slug };
}

export { usesCatalogDatabase };
