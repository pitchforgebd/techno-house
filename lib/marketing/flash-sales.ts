/**
 * Flash sale campaigns (P15-T02).
 *
 * Rows live on `FlashSale`. Product items and checkout markdowns stay
 * deferred. Guests see active campaigns only — no staff fields.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  MOCK_FLASH_DEALS,
  type AdminFlashDeal,
} from "@/lib/admin/promotions-offers-mock";
import {
  formatFlashDateTime,
  parseFlashDateTime,
} from "@/lib/marketing/flash-sale-dates";
import { getPrisma } from "@/lib/db/prisma";
import type { CampaignStatus as DbCampaignStatus } from "@/lib/generated/prisma/enums";

export {
  formatFlashDateTime,
  parseFlashDateTime,
  toFlashDateTimeLocal,
} from "@/lib/marketing/flash-sale-dates";

export const FLASH_SALES_DB_REQUIRED =
  "Flash deal changes need the database. Turn off DATA_SOURCE=mock to save.";

export type FlashSaleMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type FlashSaleActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type FlashDealTab = "all" | "active" | "inactive";

export type FlashDealListResult = {
  items: AdminFlashDeal[];
  total: number;
  params: { q: string; tab: FlashDealTab };
};

export type PublicFlashSale = {
  id: string;
  slug: string;
  title: string;
  featured: boolean;
  startsAt: string;
  endsAt: string;
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): FlashSaleMutationResult {
  return { ok: false, formError };
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function statusOnFromDb(status: DbCampaignStatus): boolean {
  return status === "ACTIVE";
}

function toAdminFlashDeal(row: {
  id: string;
  title: string;
  status: DbCampaignStatus;
  isFeatured: boolean;
  bannerSrc: string | null;
  startsAt: Date;
  endsAt: Date;
}): AdminFlashDeal {
  const startsAt = formatFlashDateTime(row.startsAt);
  return {
    id: row.id,
    title: row.title,
    bannerSrc: row.bannerSrc,
    startsAt,
    endsAt: formatFlashDateTime(row.endsAt),
    startsAtSort: row.startsAt.toISOString(),
    statusOn: statusOnFromDb(row.status),
    featured: row.isFeatured,
  };
}

function filterFlashDeals(
  items: AdminFlashDeal[],
  params: { q: string; tab: FlashDealTab },
): FlashDealListResult {
  let filtered = [...items];
  if (params.tab === "active") {
    filtered = filtered.filter((item) => item.statusOn);
  } else if (params.tab === "inactive") {
    filtered = filtered.filter((item) => !item.statusOn);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((item) => item.title.toLowerCase().includes(q));
  }
  filtered.sort((a, b) => b.startsAtSort.localeCompare(a.startsAtSort));
  return {
    items: filtered,
    total: filtered.length,
    params,
  };
}

async function recordFlashAudit(
  actor: FlashSaleActor | undefined,
  action: string,
  record: { id: string; slug?: string; title?: string },
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
    entityType: "FlashSale",
    entityId: record.id,
    metadata,
    ip: actor.ip,
  });
}

export async function listAdminFlashDeals(params: {
  q: string;
  tab: FlashDealTab;
}): Promise<FlashDealListResult> {
  if (!usesDatabase()) {
    return filterFlashDeals([...MOCK_FLASH_DEALS], params);
  }
  const rows = await getPrisma().flashSale.findMany({
    orderBy: [{ startsAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      isFeatured: true,
      bannerSrc: true,
      startsAt: true,
      endsAt: true,
    },
  });
  return filterFlashDeals(rows.map(toAdminFlashDeal), params);
}

export async function getAdminFlashDeal(
  id: string,
): Promise<AdminFlashDeal | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  if (!usesDatabase()) {
    return MOCK_FLASH_DEALS.find((item) => item.id === trimmed) ?? null;
  }
  const row = await getPrisma().flashSale.findUnique({
    where: { id: trimmed },
    select: {
      id: true,
      title: true,
      status: true,
      isFeatured: true,
      bannerSrc: true,
      startsAt: true,
      endsAt: true,
    },
  });
  return row ? toAdminFlashDeal(row) : null;
}

export async function countFlashSales(): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_FLASH_DEALS.length;
  }
  return getPrisma().flashSale.count();
}

export async function countActiveFlashSales(): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_FLASH_DEALS.filter((item) => item.statusOn).length;
  }
  return getPrisma().flashSale.count({ where: { status: "ACTIVE" } });
}

export async function listPublicFlashSales(): Promise<PublicFlashSale[]> {
  const now = new Date();
  if (!usesDatabase()) {
    return MOCK_FLASH_DEALS.filter((item) => {
      if (!item.statusOn) {
        return false;
      }
      const startsAt = parseFlashDateTime(item.startsAt);
      const endsAt = parseFlashDateTime(item.endsAt);
      if (startsAt && startsAt > now) {
        return false;
      }
      if (endsAt && endsAt < now) {
        return false;
      }
      return true;
    }).map((item) => ({
      id: item.id,
      slug: item.id,
      title: item.title,
      featured: item.featured,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    }));
  }

  const rows = await getPrisma().flashSale.findMany({
    where: {
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: [{ isFeatured: "desc" }, { startsAt: "desc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      isFeatured: true,
      startsAt: true,
      endsAt: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    featured: row.isFeatured,
    startsAt: formatFlashDateTime(row.startsAt),
    endsAt: formatFlashDateTime(row.endsAt),
  }));
}

export async function saveFlashSale(input: {
  id?: string;
  title: string;
  startsAt: string;
  endsAt: string;
  bannerSrc?: string | null;
  actor?: FlashSaleActor;
}): Promise<FlashSaleMutationResult> {
  if (!usesDatabase()) {
    return fail(FLASH_SALES_DB_REQUIRED);
  }

  const title = input.title.trim().slice(0, 80);
  if (!title) {
    return fail("Enter a flash deal title.");
  }

  const startsAt = parseFlashDateTime(input.startsAt);
  const endsAt = parseFlashDateTime(input.endsAt);
  if (!startsAt) {
    return fail("Enter a valid start date.");
  }
  if (!endsAt) {
    return fail("Enter a valid end date.");
  }
  if (endsAt < startsAt) {
    return fail("The end date must be on or after the start date.");
  }

  const existingId = input.id?.trim() ?? "";
  const slug = existingId
    ? undefined
    : normalizeSlug(title) || `flash-${Date.now()}`;

  if (!existingId && slug) {
    const slugTaken = await getPrisma().flashSale.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (slugTaken) {
      return fail("That flash deal slug is already in use.");
    }
  }

  if (existingId) {
    const existing = await getPrisma().flashSale.findUnique({
      where: { id: existingId },
      select: { id: true, slug: true },
    });
    if (!existing) {
      return fail("That flash deal no longer exists.");
    }
    await getPrisma().flashSale.update({
      where: { id: existing.id },
      data: {
        title,
        startsAt,
        endsAt,
        ...(input.bannerSrc !== undefined
          ? { bannerSrc: input.bannerSrc || null }
          : {}),
      },
    });
    await recordFlashAudit(
      input.actor,
      AUDIT_ACTIONS.FLASH_SALE_UPDATE,
      existing,
      { title },
    );
    return { ok: true, id: existing.id };
  }

  const created = await getPrisma().flashSale.create({
    data: {
      slug: slug!,
      title,
      status: "ACTIVE",
      isFeatured: false,
      startsAt,
      endsAt,
      bannerSrc: input.bannerSrc || null,
    },
  });
  await recordFlashAudit(
    input.actor,
    AUDIT_ACTIONS.FLASH_SALE_CREATE,
    created,
    {
      slug: created.slug,
      title,
    },
  );
  return { ok: true, id: created.id };
}

export async function setFlashSaleStatus(input: {
  id: string;
  statusOn: boolean;
  actor?: FlashSaleActor;
}): Promise<FlashSaleMutationResult> {
  if (!usesDatabase()) {
    return fail(FLASH_SALES_DB_REQUIRED);
  }
  const id = input.id.trim();
  const existing = await getPrisma().flashSale.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return fail("That flash deal no longer exists.");
  }
  await getPrisma().flashSale.update({
    where: { id: existing.id },
    data: { status: input.statusOn ? "ACTIVE" : "PAUSED" },
  });
  await recordFlashAudit(
    input.actor,
    AUDIT_ACTIONS.FLASH_SALE_UPDATE,
    existing,
    { statusOn: input.statusOn },
  );
  return { ok: true, id: existing.id };
}

export async function setFlashSaleFeatured(input: {
  id: string;
  featured: boolean;
  actor?: FlashSaleActor;
}): Promise<FlashSaleMutationResult> {
  if (!usesDatabase()) {
    return fail(FLASH_SALES_DB_REQUIRED);
  }
  const id = input.id.trim();
  const existing = await getPrisma().flashSale.findUnique({
    where: { id },
    select: { id: true, slug: true },
  });
  if (!existing) {
    return fail("That flash deal no longer exists.");
  }
  await getPrisma().flashSale.update({
    where: { id: existing.id },
    data: { isFeatured: input.featured },
  });
  await recordFlashAudit(
    input.actor,
    AUDIT_ACTIONS.FLASH_SALE_UPDATE,
    existing,
    { featured: input.featured },
  );
  return { ok: true, id: existing.id };
}

export async function deleteFlashSale(input: {
  id: string;
  actor?: FlashSaleActor;
}): Promise<FlashSaleMutationResult> {
  if (!usesDatabase()) {
    return fail(FLASH_SALES_DB_REQUIRED);
  }
  const id = input.id.trim();
  const existing = await getPrisma().flashSale.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true },
  });
  if (!existing) {
    return fail("That flash deal no longer exists.");
  }
  await getPrisma().flashSale.delete({ where: { id: existing.id } });
  await recordFlashAudit(
    input.actor,
    AUDIT_ACTIONS.FLASH_SALE_DELETE,
    existing,
    { slug: existing.slug, title: existing.title },
  );
  return { ok: true, id: existing.id };
}
