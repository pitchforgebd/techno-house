/**
 * Promotion campaigns (P15-T01).
 *
 * Rows live on `Promotion` with `kind = PROMOTION`. Flash sales, deals, and
 * coupons stay mock. Guests see active campaigns only — no staff fields.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import {
  MOCK_ADMIN_PROMOTIONS,
  type AdminPromotion,
  type CampaignStatus,
} from "@/lib/admin/marketing-mock";
import {
  ADMIN_MARKETING_PAGE_SIZE,
  type MarketingListParams,
} from "@/lib/admin/marketing-list-params";
import { getPrisma } from "@/lib/db/prisma";
import type {
  CampaignStatus as DbCampaignStatus,
  PromotionChannel as DbPromotionChannel,
} from "@/lib/generated/prisma/enums";

export const PROMOTIONS_DB_REQUIRED =
  "Promotion changes need the database. Turn off DATA_SOURCE=mock to save.";

export type PromotionMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type PromotionActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export type PromotionListResult = {
  items: AdminPromotion[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  params: MarketingListParams;
};

export type PublicPromotion = {
  id: string;
  slug: string;
  name: string;
  channel: AdminPromotion["channel"];
  summary: string;
  startsAt: string | null;
  endsAt: string | null;
  /** Offer artwork. Null until an admin uploads one. */
  bannerSrc: string | null;
  /** Rotated strip label; falls back to the channel when unset. */
  bannerLabel: string | null;
  /** Local storefront path the banner links to, when set. */
  bannerHref: string | null;
};

const CHANNEL_TO_DB = {
  homepage: "HOMEPAGE",
  category: "CATEGORY",
  sitewide: "SITEWIDE",
} as const satisfies Record<AdminPromotion["channel"], DbPromotionChannel>;

const CHANNEL_FROM_DB: Record<DbPromotionChannel, AdminPromotion["channel"]> = {
  HOMEPAGE: "homepage",
  CATEGORY: "category",
  SITEWIDE: "sitewide",
};

const STATUS_TO_DB = {
  draft: "DRAFT",
  scheduled: "SCHEDULED",
  active: "ACTIVE",
  paused: "PAUSED",
  ended: "ENDED",
} as const satisfies Record<CampaignStatus, DbCampaignStatus>;

const STATUS_FROM_DB: Record<DbCampaignStatus, CampaignStatus> = {
  DRAFT: "draft",
  SCHEDULED: "scheduled",
  ACTIVE: "active",
  PAUSED: "paused",
  ENDED: "ended",
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): PromotionMutationResult {
  return { ok: false, formError };
}

function dateLabel(value: Date | null): string {
  if (!value) {
    return "";
  }
  return value.toISOString().slice(0, 10);
}

function parseDateInput(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Local storefront paths only. An offer banner is admin-supplied artwork and
 * an admin-supplied destination; keeping both on-origin means a compromised
 * or careless promotion cannot point shoppers off-site.
 *
 * Returns `undefined` when the field was not submitted (leave as-is),
 * `null` when it was cleared, and `false` when the value is unusable.
 */
/** Read-side guard: anything that is not a plain local path becomes null. */
function publicLocalPath(value: string | null): string | null {
  const checked = normalizeLocalPath(value ?? undefined);
  return checked === false || checked === undefined ? null : checked;
}

function normalizeLocalPath(
  raw: string | undefined,
): string | null | false | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const value = raw.trim();
  if (!value) {
    return null;
  }
  if (value.length > 240) {
    return false;
  }
  if (!value.startsWith("/") || value.startsWith("//")) {
    return false;
  }
  if (value.includes("..") || /[<>"']/.test(value)) {
    return false;
  }
  return value;
}

function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function toAdminPromotion(row: {
  id: string;
  name: string;
  slug: string;
  status: DbCampaignStatus;
  channel: DbPromotionChannel;
  summary: string | null;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
  bannerSrc?: string | null;
  bannerLabel?: string | null;
  bannerHref?: string | null;
}): AdminPromotion {
  const startsAt = dateLabel(row.startsAt);
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: STATUS_FROM_DB[row.status],
    channel: CHANNEL_FROM_DB[row.channel],
    startsAt,
    endsAt: dateLabel(row.endsAt),
    startsAtSort: startsAt,
    summary: row.summary ?? "",
    priority: row.priority,
    bannerSrc: row.bannerSrc ?? null,
    bannerLabel: row.bannerLabel ?? null,
    bannerHref: row.bannerHref ?? null,
  };
}

function paginatePromotions(
  items: AdminPromotion[],
  params: MarketingListParams,
): PromotionListResult {
  let filtered = [...items];
  if (params.status !== "all") {
    filtered = filtered.filter((item) => item.status === params.status);
  }
  if (params.q) {
    const q = params.q.toLowerCase();
    filtered = filtered.filter((item) =>
      [item.name, item.slug, item.summary, item.channel].some((field) =>
        field.toLowerCase().includes(q),
      ),
    );
  }
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  const pageSize = ADMIN_MARKETING_PAGE_SIZE;
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, pageCount);
  const start = (page - 1) * pageSize;

  return {
    items: filtered.slice(start, start + pageSize),
    total,
    page,
    pageCount,
    pageSize,
    params: { ...params, page },
  };
}

async function recordPromotionAudit(
  actor: PromotionActor | undefined,
  action: string,
  record: { id: string; slug: string },
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
    entityType: "Promotion",
    entityId: record.id,
    metadata,
    ip: actor.ip,
  });
}

export async function listAdminPromotions(
  params: MarketingListParams,
): Promise<PromotionListResult> {
  if (!usesDatabase()) {
    return paginatePromotions([...MOCK_ADMIN_PROMOTIONS], params);
  }
  const rows = await getPrisma().promotion.findMany({
    where: { kind: "PROMOTION" },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      channel: true,
      summary: true,
      priority: true,
      startsAt: true,
      endsAt: true,
    },
  });
  return paginatePromotions(rows.map(toAdminPromotion), params);
}

export async function getAdminPromotion(
  id: string,
): Promise<AdminPromotion | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  if (!usesDatabase()) {
    return MOCK_ADMIN_PROMOTIONS.find((item) => item.id === trimmed) ?? null;
  }
  const row = await getPrisma().promotion.findFirst({
    where: { id: trimmed, kind: "PROMOTION" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      channel: true,
      summary: true,
      priority: true,
      startsAt: true,
      endsAt: true,
      bannerSrc: true,
      bannerLabel: true,
      bannerHref: true,
    },
  });
  return row ? toAdminPromotion(row) : null;
}

export async function countPromotionsByStatus(
  status: CampaignStatus,
): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_ADMIN_PROMOTIONS.filter((item) => item.status === status)
      .length;
  }
  return getPrisma().promotion.count({
    where: { kind: "PROMOTION", status: STATUS_TO_DB[status] },
  });
}

export async function countActivePromotions(): Promise<number> {
  return countPromotionsByStatus("active");
}

export async function countPromotions(): Promise<number> {
  if (!usesDatabase()) {
    return MOCK_ADMIN_PROMOTIONS.length;
  }
  return getPrisma().promotion.count({ where: { kind: "PROMOTION" } });
}

function isPubliclyActive(item: AdminPromotion, now: Date): boolean {
  if (item.status !== "active") {
    return false;
  }
  if (item.startsAt) {
    const startsAt = new Date(`${item.startsAt}T00:00:00.000Z`);
    if (!Number.isNaN(startsAt.getTime()) && startsAt > now) {
      return false;
    }
  }
  if (item.endsAt) {
    const endsAt = new Date(`${item.endsAt}T00:00:00.000Z`);
    if (!Number.isNaN(endsAt.getTime()) && endsAt < now) {
      return false;
    }
  }
  return true;
}

export async function listPublicPromotions(): Promise<PublicPromotion[]> {
  const now = new Date();
  if (!usesDatabase()) {
    return MOCK_ADMIN_PROMOTIONS.filter((item) =>
      isPubliclyActive(item, now),
    ).map((item) => ({
      id: item.id,
      slug: item.slug,
      name: item.name,
      channel: item.channel,
      summary: item.summary,
      startsAt: item.startsAt || null,
      endsAt: item.endsAt || null,
      bannerSrc: null,
      bannerLabel: null,
      bannerHref: null,
    }));
  }

  const rows = await getPrisma().promotion.findMany({
    where: {
      kind: "PROMOTION",
      status: "ACTIVE",
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
      ],
    },
    orderBy: [{ priority: "desc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      channel: true,
      summary: true,
      startsAt: true,
      endsAt: true,
      bannerSrc: true,
      bannerLabel: true,
      bannerHref: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    channel: CHANNEL_FROM_DB[row.channel],
    summary: row.summary ?? "",
    startsAt: dateLabel(row.startsAt) || null,
    endsAt: dateLabel(row.endsAt) || null,
    // Re-checked on read, not trusted because it was clean on write: these
    // columns are also reachable by direct database edits and by any future
    // importer, and both feed straight into next/image and a Link href.
    bannerSrc: publicLocalPath(row.bannerSrc),
    bannerLabel: row.bannerLabel,
    bannerHref: publicLocalPath(row.bannerHref),
  }));
}

export async function savePromotion(input: {
  id?: string;
  name: string;
  slug: string;
  status: string;
  channel: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  priority: string;
  bannerSrc?: string;
  bannerLabel?: string;
  bannerHref?: string;
  actor?: PromotionActor;
}): Promise<PromotionMutationResult> {
  if (!usesDatabase()) {
    return fail(PROMOTIONS_DB_REQUIRED);
  }

  const name = input.name.trim().slice(0, 80);
  if (!name) {
    return fail("Enter a promotion name.");
  }

  const slug = normalizeSlug(input.slug || name);
  if (!slug) {
    return fail("Enter a short slug.");
  }

  if (!(input.status in STATUS_TO_DB)) {
    return fail("Choose a valid status.");
  }
  if (!(input.channel in CHANNEL_TO_DB)) {
    return fail("Choose a valid channel.");
  }

  const status = input.status as CampaignStatus;
  const channel = input.channel as AdminPromotion["channel"];
  const startsAt = parseDateInput(input.startsAt);
  const endsAt = parseDateInput(input.endsAt);
  if (input.startsAt.trim() && !startsAt) {
    return fail("Enter a valid start date.");
  }
  if (input.endsAt.trim() && !endsAt) {
    return fail("Enter a valid end date.");
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return fail("The end date must be on or after the start date.");
  }

  const priority = Number.parseInt(input.priority, 10);
  if (!Number.isFinite(priority) || priority < 1 || priority > 10) {
    return fail("Priority must be between 1 and 10.");
  }

  const summary = input.summary.trim().slice(0, 280);

  const bannerSrc = normalizeLocalPath(input.bannerSrc);
  if (bannerSrc === false) {
    return fail("Banner image must be a local path starting with /.");
  }
  const bannerHref = normalizeLocalPath(input.bannerHref);
  if (bannerHref === false) {
    return fail("Banner link must be a local storefront path starting with /.");
  }
  const bannerLabel = (input.bannerLabel ?? "").trim().slice(0, 28) || null;

  const existingId = input.id?.trim() ?? "";

  const slugTaken = await getPrisma().promotion.findFirst({
    where: {
      slug,
      ...(existingId ? { NOT: { id: existingId } } : {}),
    },
    select: { id: true },
  });
  if (slugTaken) {
    return fail("That slug is already in use.");
  }

  const data = {
    name,
    slug,
    kind: "PROMOTION" as const,
    channel: CHANNEL_TO_DB[channel],
    status: STATUS_TO_DB[status],
    summary: summary || null,
    priority,
    startsAt,
    endsAt,
    bannerSrc,
    bannerLabel,
    bannerHref,
  };

  if (existingId) {
    const existing = await getPrisma().promotion.findFirst({
      where: { id: existingId, kind: "PROMOTION" },
      select: { id: true, slug: true },
    });
    if (!existing) {
      return fail("That promotion no longer exists.");
    }
    await getPrisma().promotion.update({
      where: { id: existing.id },
      data,
    });
    await recordPromotionAudit(
      input.actor,
      AUDIT_ACTIONS.PROMOTION_UPDATE,
      existing,
      { slug, status, channel },
    );
    return { ok: true, id: existing.id };
  }

  const created = await getPrisma().promotion.create({ data });
  await recordPromotionAudit(
    input.actor,
    AUDIT_ACTIONS.PROMOTION_CREATE,
    created,
    { slug, status, channel },
  );
  return { ok: true, id: created.id };
}
