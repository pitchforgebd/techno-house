/**
 * Admin-configurable notification type catalogue (Admin → Notifications →
 * Types, AD-258). Real CRUD against PostgreSQL. Not yet wired to automatic
 * order-lifecycle triggers — no code creates a Notification keyed to one of
 * these today; that is a separate, larger task.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import type { NotificationAudience as DbAudience } from "@/lib/generated/prisma/enums";

export type NotificationAudience = "customer" | "admin";

export type NotificationTypeRow = {
  id: string;
  name: string;
  defaultText: string;
  audience: NotificationAudience;
  enabled: boolean;
  isLocked: boolean;
};

type Actor = { staffId: string; email: string; ip?: string | null };

function toAudience(value: DbAudience): NotificationAudience {
  return value === "ADMIN" ? "admin" : "customer";
}

export async function listNotificationTypes(): Promise<NotificationTypeRow[]> {
  const rows = await getPrisma().notificationTypeSetting.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      defaultText: true,
      audience: true,
      enabled: true,
      isLocked: true,
    },
  });
  return rows.map((row) => ({ ...row, audience: toAudience(row.audience) }));
}

export type SaveResult = { ok: true; id: string } | { ok: false; formError: string };

export async function saveNotificationType(input: {
  id?: string;
  name: string;
  defaultText: string;
  actor: Actor;
}): Promise<SaveResult> {
  const name = input.name.trim().slice(0, 80);
  if (!name) {
    return { ok: false, formError: "Enter a notification type name." };
  }
  const defaultText = input.defaultText.trim().slice(0, 200);
  if (!defaultText) {
    return { ok: false, formError: "Enter the default text." };
  }

  const prisma = getPrisma();

  if (input.id) {
    const existing = await prisma.notificationTypeSetting.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, formError: "That notification type no longer exists." };
    }
    try {
      await prisma.notificationTypeSetting.update({
        where: { id: existing.id },
        data: { name, defaultText },
      });
    } catch (error) {
      if (isUniqueNameConflict(error)) {
        return { ok: false, formError: "That name is already used." };
      }
      throw error;
    }
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.NOTIFICATION_TYPE_UPDATE,
      entityType: "NotificationTypeSetting",
      entityId: existing.id,
      ip: input.actor.ip,
    });
    return { ok: true, id: existing.id };
  }

  try {
    const created = await prisma.notificationTypeSetting.create({
      data: { name, defaultText, audience: "CUSTOMER", enabled: true, isLocked: false },
      select: { id: true },
    });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.NOTIFICATION_TYPE_CREATE,
      entityType: "NotificationTypeSetting",
      entityId: created.id,
      ip: input.actor.ip,
    });
    return { ok: true, id: created.id };
  } catch (error) {
    if (isUniqueNameConflict(error)) {
      return { ok: false, formError: "That name is already used." };
    }
    throw error;
  }
}

export async function setNotificationTypeEnabled(input: {
  id: string;
  enabled: boolean;
  actor: Actor;
}): Promise<SaveResult> {
  const existing = await getPrisma().notificationTypeSetting.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That notification type no longer exists." };
  }
  await getPrisma().notificationTypeSetting.update({
    where: { id: existing.id },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.NOTIFICATION_TYPE_UPDATE,
    entityType: "NotificationTypeSetting",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { enabled: input.enabled },
  });
  return { ok: true, id: existing.id };
}

export async function bulkSetNotificationTypesEnabled(input: {
  ids: string[];
  enabled: boolean;
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const result = await getPrisma().notificationTypeSetting.updateMany({
    where: { id: { in: ids }, isLocked: false },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.NOTIFICATION_TYPE_UPDATE,
    entityType: "NotificationTypeSetting",
    ip: input.actor.ip,
    metadata: { bulk: true, enabled: input.enabled, ids, count: result.count },
  });
  return { ok: true, count: result.count };
}

function isUniqueNameConflict(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && error.code === "P2002",
  );
}
