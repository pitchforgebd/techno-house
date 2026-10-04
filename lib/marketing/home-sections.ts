/**
 * Hand-picked products for the two homepage sections, Featured and Best deals
 * (AD-357).
 *
 * Why it exists: both sections used to be computed. "Featured" was the first
 * ten products of the whole catalogue and ignored the Featured switch; "Best
 * deals" was the ten deepest discounts among everything flagged Today's Deal,
 * so flagging fifty gave the homepage the wrong ten. Staff now choose the exact
 * products and their order here. The Today's Deal flag keeps feeding the /deals
 * page, which can hold many more.
 *
 * Storefront reads fall back to the automatic list when a section is empty (or
 * the table cannot be read), so the homepage is never blank.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import {
  HOME_SECTION_MAX,
  isHomeSectionId,
  parseHomeSectionProductIds,
  type HomeSectionId,
} from "@/lib/marketing/home-section-input";

export const HOME_SECTION_DB_REQUIRED =
  "Homepage product changes need the database. Turn off DATA_SOURCE=mock to save.";

const DB_SECTION: Record<HomeSectionId, "FEATURED" | "DEALS"> = {
  featured: "FEATURED",
  deals: "DEALS",
};

export type HomeSectionActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type HomeSectionMutationResult =
  | { ok: true; count: number }
  | { ok: false; formError: string };

export type HomeSectionItem = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  priceAmount: number;
  imageSrc: string | null;
  isActive: boolean;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
};

const ITEM_SELECT = {
  id: true,
  slug: true,
  name: true,
  sku: true,
  priceAmount: true,
  isActive: true,
  stockStatus: true,
  images: {
    select: { src: true },
    orderBy: [{ isPrimary: "desc" }, { position: "asc" }],
    take: 1,
  },
} satisfies Prisma.ProductSelect;

type ItemRow = Prisma.ProductGetPayload<{ select: typeof ITEM_SELECT }>;

function toItem(row: ItemRow): HomeSectionItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    sku: row.sku,
    priceAmount: Number(row.priceAmount),
    imageSrc: row.images[0]?.src ?? null,
    isActive: row.isActive,
    stockStatus: row.stockStatus.toLowerCase() as HomeSectionItem["stockStatus"],
  };
}

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

/**
 * Storefront: the chosen products' slugs in the operator's order, published
 * ones only. Never throws — if the table cannot be read (for example a deploy
 * that has not run its migration yet) the homepage must keep rendering, so it
 * returns an empty list and the caller falls back to the automatic selection.
 */
export async function getHomeSectionSlugs(
  section: HomeSectionId,
): Promise<string[]> {
  if (!usesDatabase()) {
    return [];
  }
  try {
    const rows = await getPrisma().homeSectionProduct.findMany({
      where: { section: DB_SECTION[section], product: { isActive: true } },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      take: HOME_SECTION_MAX,
      select: { product: { select: { slug: true } } },
    });
    return rows.map((row) => row.product.slug);
  } catch (error) {
    console.error(
      "Homepage section read failed; using the automatic list.",
      error instanceof Error ? error.message : "unknown error",
    );
    return [];
  }
}

/** Admin: the section as saved, including products that are currently unpublished. */
export async function getAdminHomeSection(
  section: HomeSectionId,
): Promise<HomeSectionItem[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().homeSectionProduct.findMany({
    where: { section: DB_SECTION[section] },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { product: { select: ITEM_SELECT } },
  });
  return rows.map((row) => toItem(row.product));
}

/**
 * Admin picker search: published products whose name or SKU contains every
 * typed word (so "msi b650" finds "MSI PRO B650M-A"). Needs two characters.
 */
export async function searchHomeSectionCandidates(input: {
  query: string;
  take?: number;
}): Promise<HomeSectionItem[]> {
  if (!usesDatabase()) {
    return [];
  }
  const words = input.query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .map((word) => word.slice(0, 60));
  if (words.join("").length < 2) {
    return [];
  }
  const rows = await getPrisma().product.findMany({
    where: {
      isActive: true,
      AND: words.map((word) => ({
        OR: [
          { name: { contains: word, mode: "insensitive" as const } },
          { sku: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    },
    orderBy: { name: "asc" },
    take: Math.min(input.take ?? 20, 40),
    select: ITEM_SELECT,
  });
  return rows.map(toItem);
}

/**
 * Replaces a section's products with exactly `productIds`, in that order.
 * Validation lives in `parseHomeSectionProductIds` (max ten, no duplicates,
 * every id must be a real product); an empty list clears the section.
 */
export async function saveHomeSection(input: {
  section: unknown;
  productIds: unknown;
  actor?: HomeSectionActor;
}): Promise<HomeSectionMutationResult> {
  if (!isHomeSectionId(input.section)) {
    return { ok: false, formError: "Unknown homepage section." };
  }
  if (!usesDatabase()) {
    return { ok: false, formError: HOME_SECTION_DB_REQUIRED };
  }
  const parsed = parseHomeSectionProductIds(input.productIds);
  if (!parsed.ok) {
    return parsed;
  }
  const { ids } = parsed;
  const section = DB_SECTION[input.section];

  if (ids.length > 0) {
    const found = await getPrisma().product.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      return { ok: false, formError: "One or more products no longer exist." };
    }
  }

  await getPrisma().$transaction([
    getPrisma().homeSectionProduct.deleteMany({ where: { section } }),
    getPrisma().homeSectionProduct.createMany({
      data: ids.map((productId, position) => ({ section, productId, position })),
    }),
  ]);

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.HOME_SECTION_UPDATE,
      entityType: "HomeSection",
      entityId: input.section,
      ip: input.actor.ip,
      metadata: { count: ids.length },
    });
  }

  return { ok: true, count: ids.length };
}
