/**
 * Global notification channel defaults (Admin → Notifications → Settings,
 * AD-258). Real persistence. Does not itself gate whether email/SMS
 * actually send — "Send custom" only ever creates in-app rows today.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type NotificationSettingsView = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  fromName: string;
};

const DEFAULTS: NotificationSettingsView = {
  emailEnabled: true,
  smsEnabled: true,
  pushEnabled: false,
  fromName: "Techno House",
};

export async function getNotificationSettings(): Promise<NotificationSettingsView> {
  const row = await getPrisma().notificationSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return { ...DEFAULTS };
  }
  return {
    emailEnabled: row.emailEnabled,
    smsEnabled: row.smsEnabled,
    pushEnabled: row.pushEnabled,
    fromName: row.fromName,
  };
}

export type SaveResult = { ok: true } | { ok: false; formError: string };

export async function saveNotificationSettings(input: {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  fromName: string;
  actor: { staffId: string; email: string; ip?: string | null };
}): Promise<SaveResult> {
  const fromName = input.fromName.trim().slice(0, 80);
  if (!fromName) {
    return { ok: false, formError: "Enter a from name." };
  }

  await getPrisma().notificationSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      emailEnabled: input.emailEnabled,
      smsEnabled: input.smsEnabled,
      pushEnabled: input.pushEnabled,
      fromName,
    },
    update: {
      emailEnabled: input.emailEnabled,
      smsEnabled: input.smsEnabled,
      pushEnabled: input.pushEnabled,
      fromName,
    },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.NOTIFICATION_SETTINGS_UPDATE,
    entityType: "NotificationSettings",
    entityId: "singleton",
    ip: input.actor.ip,
  });

  return { ok: true };
}
