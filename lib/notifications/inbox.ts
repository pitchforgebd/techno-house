/**
 * In-app notification inbox (P15-T05).
 *
 * Rows live on `Notification`. Types, channel settings, and email/SMS/push
 * delivery are not persisted (no tables; SMTP/OTP wait for Phase 16).
 * Guests and `DATA_SOURCE=mock` keep the local mock inbox.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import type { CustomNotificationHistoryRow } from "@/lib/admin/engagement-mock";
import { getPrisma } from "@/lib/db/prisma";
import {
  CUSTOM_NOTIFICATION_AUDIENCES,
  CUSTOM_NOTIFICATION_TYPES,
  type CustomNotificationAudience,
  type CustomNotificationType,
  type InboxNotification,
} from "@/lib/notifications/types";

export const NOTIFICATIONS_DB_REQUIRED =
  "Notification changes need the database. Turn off DATA_SOURCE=mock to save.";

export const WELCOME_NOTIFICATION_ID = "ntf-welcome-demo";

export type NotificationMutationResult =
  { ok: true; id: string; count?: number } | { ok: false; formError: string };

export type NotificationActor = {
  staffId?: string;
  userId?: string;
  email: string;
  ip?: string | null;
};

export const WELCOME_INBOX: InboxNotification = {
  id: WELCOME_NOTIFICATION_ID,
  kind: "account",
  title: "Your account is ready",
  body: "Alerts here are saved to your account. Email and SMS wait for a later phase.",
  href: "/account/profile",
  createdAt: "2026-08-01T00:00:00.000Z",
  readAt: null,
};

function usesDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function fail(formError: string): NotificationMutationResult {
  return { ok: false, formError };
}

function dateTimeLabel(value: Date): string {
  return value.toISOString().slice(0, 16).replace("T", " ");
}

function toInbox(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: Date;
  readAt: Date | null;
}): InboxNotification {
  return {
    id: row.id,
    kind: row.type,
    title: row.title,
    body: row.body ?? "",
    href: row.href ?? "",
    createdAt: row.createdAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
  };
}

function toHistoryRow(row: {
  id: string;
  type: string;
  title: string;
  href: string | null;
  sentAt: Date | null;
  createdAt: Date;
}): CustomNotificationHistoryRow {
  return {
    id: row.id,
    type: row.type,
    dateTime: dateTimeLabel(row.sentAt ?? row.createdAt),
    notification: row.title,
    link: row.href ?? "",
  };
}

export function sanitizeInboxHref(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 200);
  if (!trimmed) {
    return "";
  }
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes(":")
  ) {
    return null;
  }
  return trimmed;
}

export async function listCustomerInbox(
  userId: string,
): Promise<InboxNotification[]> {
  if (!usesDatabase()) {
    return [WELCOME_INBOX];
  }
  const trimmed = userId.trim();
  if (!trimmed) {
    return [];
  }
  const rows = await getPrisma().notification.findMany({
    where: { userId: trimmed, channel: "IN_APP" },
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(toInbox);
}

export async function listAdminCustomHistory(): Promise<
  CustomNotificationHistoryRow[]
> {
  if (!usesDatabase()) {
    return [];
  }
  const rows = await getPrisma().notification.findMany({
    where: { type: { in: [...CUSTOM_NOTIFICATION_TYPES] } },
    orderBy: [{ createdAt: "desc" }],
  });
  return rows.map(toHistoryRow);
}

export async function markNotificationRead(input: {
  userId: string;
  id: string;
}): Promise<NotificationMutationResult> {
  if (!usesDatabase()) {
    return fail(NOTIFICATIONS_DB_REQUIRED);
  }
  const id = input.id.trim();
  const userId = input.userId.trim();
  if (!id || !userId) {
    return fail("Choose a notification.");
  }
  const updated = await getPrisma().notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (updated.count === 0) {
    const existing = await getPrisma().notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) {
      return fail("That notification no longer exists.");
    }
  }
  return { ok: true, id };
}

export async function markAllNotificationsRead(input: {
  userId: string;
}): Promise<NotificationMutationResult> {
  if (!usesDatabase()) {
    return fail(NOTIFICATIONS_DB_REQUIRED);
  }
  const userId = input.userId.trim();
  if (!userId) {
    return fail("Sign in to continue.");
  }
  await getPrisma().notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true, id: userId };
}

export async function sendCustomNotification(input: {
  audience: string;
  type: string;
  content: string;
  link: string;
  actor?: NotificationActor;
}): Promise<NotificationMutationResult> {
  if (!usesDatabase()) {
    return fail(NOTIFICATIONS_DB_REQUIRED);
  }
  if (
    !CUSTOM_NOTIFICATION_AUDIENCES.includes(
      input.audience as CustomNotificationAudience,
    )
  ) {
    return fail("Choose a customer audience.");
  }
  if (
    !CUSTOM_NOTIFICATION_TYPES.includes(input.type as CustomNotificationType)
  ) {
    return fail("Choose a notification type.");
  }
  const content = input.content.trim().slice(0, 80);
  if (!content) {
    return fail("Enter notification content.");
  }
  const href = sanitizeInboxHref(input.link);
  if (href == null) {
    return fail("Use a same-site path starting with /.");
  }

  const audience = input.audience as CustomNotificationAudience;
  const prisma = getPrisma();
  const recipients = await prisma.user.findMany({
    where:
      audience === "recent"
        ? { status: "ACTIVE", orders: { some: {} } }
        : { status: "ACTIVE" },
    select: { id: true },
  });
  if (recipients.length === 0) {
    return fail("No customers match that audience.");
  }

  const sentAt = new Date();
  const created = await prisma.notification.createMany({
    data: recipients.map((user) => ({
      userId: user.id,
      channel: "IN_APP" as const,
      type: input.type,
      title: content,
      body: content,
      href: href || null,
      sentAt,
    })),
  });

  const first = await prisma.notification.findFirst({
    where: { type: input.type, sentAt, title: content },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });

  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId ?? null,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.NOTIFICATION_SEND,
      entityType: "Notification",
      entityId: first?.id ?? null,
      metadata: {
        type: input.type,
        audience,
        count: created.count,
      },
      ip: input.actor.ip,
    });
  }

  return { ok: true, id: first?.id ?? "sent", count: created.count };
}

export async function deleteCustomNotifications(input: {
  ids: string[];
  actor?: NotificationActor;
}): Promise<NotificationMutationResult> {
  if (!usesDatabase()) {
    return fail(NOTIFICATIONS_DB_REQUIRED);
  }
  const ids = [...new Set(input.ids.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return fail("Choose at least one notification.");
  }
  const deleted = await getPrisma().notification.deleteMany({
    where: {
      id: { in: ids },
      type: { in: [...CUSTOM_NOTIFICATION_TYPES] },
    },
  });
  if (deleted.count === 0) {
    return fail("Those notifications could not be deleted.");
  }
  if (input.actor) {
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId ?? null,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.NOTIFICATION_DELETE,
      entityType: "Notification",
      entityId: ids[0] ?? null,
      metadata: { count: deleted.count },
      ip: input.actor.ip,
    });
  }
  return { ok: true, id: ids[0] ?? "deleted", count: deleted.count };
}
