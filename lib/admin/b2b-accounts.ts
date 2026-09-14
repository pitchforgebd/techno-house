/**
 * Admin B2B (wholesale) account review — real Postgres (AD-257).
 * Every B2BAccount is tied to a real customer `User`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import type { B2BStatus } from "@/lib/generated/prisma/enums";
import type { AdminB2BTab } from "@/lib/admin/b2b-list-shared";

export {
  adminB2BHref,
  parseAdminB2BParams,
  type AdminB2BTab,
} from "@/lib/admin/b2b-list-shared";

const PAGE_SIZE = 20;

export type AdminB2BListItem = {
  id: string;
  company: string;
  contactName: string;
  status: B2BStatus;
  discountPercent: number;
  tier: string | null;
  createdAt: string;
  customer: { id: string; fullName: string; email: string; phone: string | null };
};

export type AdminB2BListResult = {
  items: AdminB2BListItem[];
  total: number;
  page: number;
  pageCount: number;
  tab: AdminB2BTab;
  q: string;
};

export type AdminB2BDetail = AdminB2BListItem & {
  shopAddress: string | null;
  notes: string | null;
  approvedAt: string | null;
  hasTradeLicence: boolean;
  hasNid: boolean;
};

type Actor = { staffId: string; email: string; ip?: string | null };

function tabToStatus(tab: AdminB2BTab): B2BStatus | undefined {
  switch (tab) {
    case "pending":
      return "PENDING";
    case "active":
      return "ACTIVE";
    case "suspended":
      return "SUSPENDED";
    default:
      return undefined;
  }
}

function toListItem(row: {
  id: string;
  company: string;
  contactName: string;
  status: B2BStatus;
  discountPercent: number;
  tier: string | null;
  createdAt: Date;
  user: { id: string; fullName: string; email: string; phone: string | null };
}): AdminB2BListItem {
  return {
    id: row.id,
    company: row.company,
    contactName: row.contactName,
    status: row.status,
    discountPercent: row.discountPercent,
    tier: row.tier,
    createdAt: row.createdAt.toISOString().slice(0, 10),
    customer: row.user,
  };
}

export async function listAdminB2BAccounts(input: {
  tab: AdminB2BTab;
  q?: string;
  page?: number;
}): Promise<AdminB2BListResult> {
  const status = tabToStatus(input.tab);
  const q = input.q?.trim().slice(0, 120) || "";
  const page = Math.max(1, input.page ?? 1);

  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { company: { contains: q, mode: "insensitive" as const } },
            { contactName: { contains: q, mode: "insensitive" as const } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { phone: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const prisma = getPrisma();
  const total = await prisma.b2BAccount.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);

  const rows = await prisma.b2BAccount.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      company: true,
      contactName: true,
      status: true,
      discountPercent: true,
      tier: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });

  return {
    items: rows.map(toListItem),
    total,
    page: currentPage,
    pageCount,
    tab: input.tab,
    q,
  };
}

export async function getAdminB2BAccountById(id: string): Promise<AdminB2BDetail | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().b2BAccount.findUnique({
    where: { id: trimmed },
    select: {
      id: true,
      company: true,
      contactName: true,
      status: true,
      discountPercent: true,
      tier: true,
      shopAddress: true,
      notes: true,
      approvedAt: true,
      tradeLicenceMedia: true,
      nidMedia: true,
      createdAt: true,
      user: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });
  if (!row) {
    return null;
  }
  return {
    ...toListItem(row),
    shopAddress: row.shopAddress,
    notes: row.notes,
    approvedAt: row.approvedAt ? row.approvedAt.toISOString().slice(0, 10) : null,
    hasTradeLicence: Boolean(row.tradeLicenceMedia),
    hasNid: Boolean(row.nidMedia),
  };
}

export async function getB2BDocumentKey(
  id: string,
  which: "licence" | "nid",
): Promise<string | null> {
  const row = await getPrisma().b2BAccount.findUnique({
    where: { id },
    select: { tradeLicenceMedia: true, nidMedia: true },
  });
  if (!row) {
    return null;
  }
  return which === "licence" ? row.tradeLicenceMedia : row.nidMedia;
}

export type SaveB2BResult = { ok: true } | { ok: false; formError: string };

export async function approveB2BAccount(input: {
  id: string;
  discountPercent: number;
  tier: string;
  notes: string;
  actor: Actor;
}): Promise<SaveB2BResult> {
  if (!Number.isInteger(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 90) {
    return { ok: false, formError: "Discount must be a whole number between 0 and 90." };
  }
  const existing = await getPrisma().b2BAccount.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That application no longer exists." };
  }

  await getPrisma().b2BAccount.update({
    where: { id: existing.id },
    data: {
      status: "ACTIVE",
      discountPercent: input.discountPercent,
      tier: input.tier.trim().slice(0, 40) || null,
      notes: input.notes.trim().slice(0, 2000) || null,
      approvedAt: new Date(),
    },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.B2B_APPROVE,
    entityType: "B2BAccount",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { discountPercent: input.discountPercent, tier: input.tier },
  });

  return { ok: true };
}

export async function updateB2BAccount(input: {
  id: string;
  discountPercent: number;
  tier: string;
  notes: string;
  actor: Actor;
}): Promise<SaveB2BResult> {
  if (!Number.isInteger(input.discountPercent) || input.discountPercent < 0 || input.discountPercent > 90) {
    return { ok: false, formError: "Discount must be a whole number between 0 and 90." };
  }
  const existing = await getPrisma().b2BAccount.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That account no longer exists." };
  }

  await getPrisma().b2BAccount.update({
    where: { id: existing.id },
    data: {
      discountPercent: input.discountPercent,
      tier: input.tier.trim().slice(0, 40) || null,
      notes: input.notes.trim().slice(0, 2000) || null,
    },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.B2B_UPDATE,
    entityType: "B2BAccount",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { discountPercent: input.discountPercent, tier: input.tier },
  });

  return { ok: true };
}

export async function setB2BAccountSuspended(input: {
  id: string;
  suspended: boolean;
  actor: Actor;
}): Promise<SaveB2BResult> {
  const existing = await getPrisma().b2BAccount.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That account no longer exists." };
  }

  await getPrisma().b2BAccount.update({
    where: { id: existing.id },
    data: { status: input.suspended ? "SUSPENDED" : "ACTIVE" },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: input.suspended ? AUDIT_ACTIONS.B2B_SUSPEND : AUDIT_ACTIONS.B2B_REACTIVATE,
    entityType: "B2BAccount",
    entityId: existing.id,
    ip: input.actor.ip,
  });

  return { ok: true };
}
