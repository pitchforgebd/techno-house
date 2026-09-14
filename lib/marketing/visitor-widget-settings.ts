/**
 * Admin config for the real "N people are viewing this" PDP widget
 * (Admin → Marketing → Custom Visitors, AD-258).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";

export type VisitorWidgetSettingsView = {
  enabled: boolean;
  windowMinutes: number;
  minToShow: number;
};

const DEFAULTS: VisitorWidgetSettingsView = {
  enabled: false,
  windowMinutes: 15,
  minToShow: 2,
};

export async function getVisitorWidgetSettings(): Promise<VisitorWidgetSettingsView> {
  const row = await getPrisma().visitorWidgetSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!row) {
    return { ...DEFAULTS };
  }
  return {
    enabled: row.enabled,
    windowMinutes: row.windowMinutes,
    minToShow: row.minToShow,
  };
}

export type SaveResult = { ok: true } | { ok: false; formError: string };

export async function saveVisitorWidgetSettings(input: {
  enabled: boolean;
  windowMinutes: number;
  minToShow: number;
  actor: { staffId: string; email: string; ip?: string | null };
}): Promise<SaveResult> {
  if (!Number.isInteger(input.windowMinutes) || input.windowMinutes < 1 || input.windowMinutes > 1440) {
    return { ok: false, formError: "Window must be between 1 and 1440 minutes." };
  }
  if (!Number.isInteger(input.minToShow) || input.minToShow < 1 || input.minToShow > 100) {
    return { ok: false, formError: "Minimum to show must be between 1 and 100." };
  }

  await getPrisma().visitorWidgetSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      enabled: input.enabled,
      windowMinutes: input.windowMinutes,
      minToShow: input.minToShow,
    },
    update: {
      enabled: input.enabled,
      windowMinutes: input.windowMinutes,
      minToShow: input.minToShow,
    },
  });

  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.VISITOR_WIDGET_SETTINGS_UPDATE,
    entityType: "VisitorWidgetSettings",
    entityId: "singleton",
    ip: input.actor.ip,
  });

  return { ok: true };
}
