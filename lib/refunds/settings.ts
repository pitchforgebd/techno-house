/**
 * Refund policy settings (AD-233).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { usesDatabase } from "@/lib/runtime/data-source";

export type RefundTypeMode = "global" | "category";

export type RefundPolicySettings = {
  refundType: RefundTypeMode;
  globalRefundDays: number;
  disputeEnabled: boolean;
  disputeDays: number;
  stickerSrc: string | null;
  categoryDays: Record<string, number>;
};

export type RefundReasonRow = {
  id: string;
  type: "customer" | "admin_reject";
  reason: string;
  isActive: boolean;
};

export type RefundSettingsMutationResult =
  | { ok: true; id: string }
  | { ok: false; formError: string };

export type RefundSettingsActor = {
  staffId: string;
  email: string;
  ip?: string | null;
};

export const REFUND_SETTINGS_DB_REQUIRED =
  "Refund settings need the database. Remove DATA_SOURCE=mock to save.";

export const DEFAULT_REFUND_POLICY: RefundPolicySettings = {
  refundType: "global",
  globalRefundDays: 7,
  disputeEnabled: false,
  disputeDays: 3,
  stickerSrc: null,
  categoryDays: {},
};

const REASON_MAX = 120;
const DAYS_MAX = 365;

function fail(formError: string): RefundSettingsMutationResult {
  return { ok: false, formError };
}

function parseCategoryDays(raw: string | null | undefined): Record<string, number> {
  if (!raw?.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    const out: Record<string, number> = {};
    for (const [slug, value] of Object.entries(parsed as Record<string, unknown>)) {
      const key = slug.trim().slice(0, 80);
      const days = typeof value === "number" ? value : Number(value);
      if (!key || !Number.isInteger(days) || days < 0 || days > DAYS_MAX) {
        continue;
      }
      out[key] = days;
    }
    return out;
  } catch {
    return {};
  }
}

function toPolicy(row: {
  refundType: string;
  globalRefundDays: number;
  disputeEnabled: boolean;
  disputeDays: number;
  stickerSrc: string | null;
  categoryDaysJson: string;
}): RefundPolicySettings {
  return {
    refundType: row.refundType === "category" ? "category" : "global",
    globalRefundDays: Math.max(0, Math.min(DAYS_MAX, row.globalRefundDays)),
    disputeEnabled: row.disputeEnabled,
    disputeDays: Math.max(0, Math.min(DAYS_MAX, row.disputeDays)),
    stickerSrc: row.stickerSrc?.trim() || null,
    categoryDays: parseCategoryDays(row.categoryDaysJson),
  };
}

export async function getRefundPolicySettings(): Promise<RefundPolicySettings> {
  if (!usesDatabase()) {
    return { ...DEFAULT_REFUND_POLICY };
  }
  const row = await getPrisma().refundSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return { ...DEFAULT_REFUND_POLICY };
  }
  return toPolicy(row);
}

export async function listAdminRefundReasons(): Promise<RefundReasonRow[]> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().refundReason.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, reason: true, isActive: true },
  });
  return rows.map((row) => ({
    id: row.id,
    type: row.type === "STAFF" ? "admin_reject" : "customer",
    reason: row.reason,
    isActive: row.isActive,
  }));
}

export async function saveRefundPolicySettings(input: {
  refundType: RefundTypeMode;
  globalRefundDays: number;
  disputeEnabled: boolean;
  disputeDays: number;
  stickerSrc?: string | null;
  categoryDays?: Record<string, number>;
  actor: RefundSettingsActor;
}): Promise<RefundSettingsMutationResult> {
  if (!usesDatabase()) {
    return fail(REFUND_SETTINGS_DB_REQUIRED);
  }

  const refundType: RefundTypeMode =
    input.refundType === "category" ? "category" : "global";
  const globalRefundDays = Number(input.globalRefundDays);
  const disputeDays = Number(input.disputeDays);
  if (
    !Number.isInteger(globalRefundDays) ||
    globalRefundDays < 0 ||
    globalRefundDays > DAYS_MAX
  ) {
    return fail("Global refund days must be between 0 and 365.");
  }
  if (
    !Number.isInteger(disputeDays) ||
    disputeDays < 0 ||
    disputeDays > DAYS_MAX
  ) {
    return fail("Dispute days must be between 0 and 365.");
  }

  const stickerSrc =
    input.stickerSrc === undefined
      ? undefined
      : input.stickerSrc?.trim().slice(0, 500) || null;

  let categoryDaysJson: string | undefined;
  if (input.categoryDays !== undefined) {
    const cleaned: Record<string, number> = {};
    for (const [slug, value] of Object.entries(input.categoryDays)) {
      const key = slug.trim().slice(0, 80);
      const days = Number(value);
      if (!key || !Number.isInteger(days) || days < 0 || days > DAYS_MAX) {
        continue;
      }
      cleaned[key] = days;
    }
    categoryDaysJson = JSON.stringify(cleaned);
  }

  const prisma = getPrisma();
  const existing = await prisma.refundSettings.findUnique({
    where: { id: "singleton" },
  });

  const data = {
    refundType,
    globalRefundDays,
    disputeEnabled: Boolean(input.disputeEnabled),
    disputeDays,
    ...(stickerSrc !== undefined ? { stickerSrc } : {}),
    ...(categoryDaysJson !== undefined ? { categoryDaysJson } : {}),
  };

  const saved = existing
    ? await prisma.refundSettings.update({
        where: { id: "singleton" },
        data,
        select: { id: true },
      })
    : await prisma.refundSettings.create({
        data: { id: "singleton", ...data },
        select: { id: true },
      });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.REFUND_SETTINGS_UPDATE,
    entityType: "RefundSettings",
    entityId: saved.id,
    ip: input.actor.ip,
    metadata: {
      refundType,
      globalRefundDays,
      disputeEnabled: Boolean(input.disputeEnabled),
      disputeDays,
    },
  });

  return { ok: true, id: saved.id };
}

export async function createRefundReason(input: {
  type: "customer" | "admin_reject";
  reason: string;
  actor: RefundSettingsActor;
}): Promise<RefundSettingsMutationResult> {
  if (!usesDatabase()) {
    return fail(REFUND_SETTINGS_DB_REQUIRED);
  }
  const reason = input.reason.replace(/[<>]/g, "").trim().slice(0, REASON_MAX);
  if (reason.length < 2) {
    return fail("Enter a refund reason.");
  }
  const type = input.type === "admin_reject" ? "STAFF" : "CUSTOMER";
  const created = await getPrisma().refundReason.create({
    data: { type, reason, isActive: true },
    select: { id: true },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.REFUND_REASON_CREATE,
    entityType: "RefundReason",
    entityId: created.id,
    ip: input.actor.ip,
    metadata: { type: input.type },
  });
  return { ok: true, id: created.id };
}

export async function deleteRefundReason(input: {
  id: string;
  actor: RefundSettingsActor;
}): Promise<RefundSettingsMutationResult> {
  if (!usesDatabase()) {
    return fail(REFUND_SETTINGS_DB_REQUIRED);
  }
  const id = input.id.trim();
  if (!id) {
    return fail("Reason was not found.");
  }
  const prisma = getPrisma();
  const existing = await prisma.refundReason.findUnique({
    where: { id },
    select: { id: true, _count: { select: { refunds: true } } },
  });
  if (!existing) {
    return fail("Reason was not found.");
  }
  if (existing._count.refunds > 0) {
    await prisma.refundReason.update({
      where: { id },
      data: { isActive: false },
    });
  } else {
    await prisma.refundReason.delete({ where: { id } });
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.REFUND_REASON_DELETE,
    entityType: "RefundReason",
    entityId: id,
    ip: input.actor.ip,
  });
  return { ok: true, id };
}

export async function setRefundReasonActive(input: {
  id: string;
  isActive: boolean;
  actor: RefundSettingsActor;
}): Promise<RefundSettingsMutationResult> {
  if (!usesDatabase()) {
    return fail(REFUND_SETTINGS_DB_REQUIRED);
  }
  const id = input.id.trim();
  if (!id) {
    return fail("Reason was not found.");
  }
  const existing = await getPrisma().refundReason.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return fail("Reason was not found.");
  }
  await getPrisma().refundReason.update({
    where: { id },
    data: { isActive: Boolean(input.isActive) },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.REFUND_REASON_UPDATE,
    entityType: "RefundReason",
    entityId: id,
    ip: input.actor.ip,
    metadata: { isActive: Boolean(input.isActive) },
  });
  return { ok: true, id };
}

export async function bulkUpdateRefundReasons(input: {
  ids: string[];
  action: "enable" | "disable" | "delete";
  actor: RefundSettingsActor;
}): Promise<RefundSettingsMutationResult> {
  if (!usesDatabase()) {
    return fail(REFUND_SETTINGS_DB_REQUIRED);
  }
  const ids = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    100,
  );
  if (ids.length === 0) {
    return fail("Select at least one reason.");
  }

  if (input.action === "delete") {
    for (const id of ids) {
      const result = await deleteRefundReason({ id, actor: input.actor });
      if (!result.ok) {
        return result;
      }
    }
    return { ok: true, id: ids[0]! };
  }

  const isActive = input.action === "enable";
  await getPrisma().refundReason.updateMany({
    where: { id: { in: ids } },
    data: { isActive },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.REFUND_REASON_UPDATE,
    entityType: "RefundReason",
    entityId: ids[0]!,
    ip: input.actor.ip,
    metadata: { action: input.action, count: ids.length },
  });
  return { ok: true, id: ids[0]! };
}

/** Days allowed for a new customer refund request on this order. */
export async function resolveRefundWindowDays(input: {
  categorySlugs: string[];
}): Promise<number> {
  const settings = await getRefundPolicySettings();
  if (settings.refundType === "category") {
    const matched = input.categorySlugs
      .map((slug) => settings.categoryDays[slug])
      .filter((days): days is number => typeof days === "number");
    if (matched.length === 0) {
      return 0;
    }
    return Math.max(...matched);
  }
  return settings.globalRefundDays;
}

export function refundWindowDeadline(
  anchor: Date,
  days: number,
): Date {
  const end = new Date(anchor.getTime());
  end.setUTCDate(end.getUTCDate() + Math.max(0, days));
  return end;
}
