/**
 * Custom alerts — a small storefront corner toast (Admin → Marketing →
 * Custom Alerts, AD-259). Real Postgres CRUD; rendered for real on the
 * storefront via `getActiveAlertForStorefront()`. Separate from the modal
 * Popup (lib/marketing/popups.ts).
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

export type AlertLocation = "bottom-left" | "bottom-right" | "top-left" | "top-right";
export type AlertSize = "small" | "large";
export type AlertTextTone = "light" | "dark";

export type AdminAlert = {
  id: string;
  text: string;
  linkLabel: string | null;
  link: string | null;
  imagePath: string | null;
  size: AlertSize;
  backgroundColor: string;
  textTone: AlertTextTone;
  location: AlertLocation;
  autoCloseSeconds: number | null;
  enabled: boolean;
  isLocked: boolean;
};

type Actor = { staffId: string; email: string; ip?: string | null };

const LOCATIONS: AlertLocation[] = ["bottom-left", "bottom-right", "top-left", "top-right"];

function toLocation(value: string): AlertLocation {
  return (LOCATIONS as string[]).includes(value) ? (value as AlertLocation) : "bottom-left";
}
function toSize(value: string): AlertSize {
  return value === "large" ? "large" : "small";
}
function toTone(value: string): AlertTextTone {
  return value === "dark" ? "dark" : "light";
}

const alertSelect = {
  id: true,
  text: true,
  linkLabel: true,
  link: true,
  imagePath: true,
  size: true,
  backgroundColor: true,
  textTone: true,
  location: true,
  autoCloseSeconds: true,
  enabled: true,
  isLocked: true,
} as const;

function toAdminAlert(row: {
  id: string;
  text: string;
  linkLabel: string | null;
  link: string | null;
  imagePath: string | null;
  size: string;
  backgroundColor: string;
  textTone: string;
  location: string;
  autoCloseSeconds: number | null;
  enabled: boolean;
  isLocked: boolean;
}): AdminAlert {
  return {
    ...row,
    size: toSize(row.size),
    textTone: toTone(row.textTone),
    location: toLocation(row.location),
  };
}

export async function listAdminAlerts(): Promise<AdminAlert[]> {
  const rows = await getPrisma().alert.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    select: alertSelect,
  });
  return rows.map(toAdminAlert);
}

export async function getAdminAlert(id: string): Promise<AdminAlert | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().alert.findUnique({
    where: { id: trimmed },
    select: alertSelect,
  });
  return row ? toAdminAlert(row) : null;
}

export type SaveResult = { ok: true; id: string } | { ok: false; formError: string };

export async function saveAlert(input: {
  id?: string;
  text: string;
  linkLabel: string;
  link: string;
  size: AlertSize;
  backgroundColor: string;
  textTone: AlertTextTone;
  location: AlertLocation;
  autoCloseSeconds: number | null;
  imageFile?: File | null;
  actor: Actor;
}): Promise<SaveResult> {
  const text = input.text.trim().slice(0, 200);
  if (!text) {
    return { ok: false, formError: "Enter the alert text." };
  }
  const backgroundColor = /^#[0-9a-fA-F]{3,8}$/.test(input.backgroundColor)
    ? input.backgroundColor
    : "#000000";
  const autoCloseSeconds =
    input.autoCloseSeconds != null && Number.isFinite(input.autoCloseSeconds) && input.autoCloseSeconds > 0
      ? Math.min(3600, Math.round(input.autoCloseSeconds))
      : null;

  let imagePath: string | undefined;
  if (input.imageFile && input.imageFile.size > 0) {
    const uploaded = await uploadAdminMediaFiles({
      files: [input.imageFile],
      folder: "general",
      actor: { staffId: input.actor.staffId, email: input.actor.email },
    });
    if (!uploaded.ok) {
      return uploaded;
    }
    imagePath = uploaded.path;
  }

  const prisma = getPrisma();
  const data = {
    text,
    linkLabel: input.linkLabel.trim().slice(0, 40) || null,
    link: input.link.trim().slice(0, 300) || null,
    size: input.size,
    backgroundColor,
    textTone: input.textTone,
    location: input.location,
    autoCloseSeconds,
    ...(imagePath ? { imagePath } : {}),
  };

  if (input.id) {
    const existing = await prisma.alert.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, formError: "That alert no longer exists." };
    }
    await prisma.alert.update({ where: { id: existing.id }, data });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.ALERT_UPDATE,
      entityType: "Alert",
      entityId: existing.id,
      ip: input.actor.ip,
    });
    return { ok: true, id: existing.id };
  }

  const created = await prisma.alert.create({
    data: { ...data, enabled: false, imagePath: imagePath ?? null },
    select: { id: true },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.ALERT_CREATE,
    entityType: "Alert",
    entityId: created.id,
    ip: input.actor.ip,
  });
  return { ok: true, id: created.id };
}

export async function setAlertEnabled(input: {
  id: string;
  enabled: boolean;
  actor: Actor;
}): Promise<SaveResult> {
  const existing = await getPrisma().alert.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That alert no longer exists." };
  }
  await getPrisma().alert.update({
    where: { id: existing.id },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.ALERT_UPDATE,
    entityType: "Alert",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { enabled: input.enabled },
  });
  return { ok: true, id: existing.id };
}

export async function bulkSetAlertsEnabled(input: {
  ids: string[];
  enabled: boolean;
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const result = await getPrisma().alert.updateMany({
    where: { id: { in: ids }, isLocked: false },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.ALERT_UPDATE,
    entityType: "Alert",
    ip: input.actor.ip,
    metadata: { bulk: true, enabled: input.enabled, ids, count: result.count },
  });
  return { ok: true, count: result.count };
}

export async function bulkDeleteAlerts(input: {
  ids: string[];
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const result = await getPrisma().alert.deleteMany({
    where: { id: { in: ids }, isLocked: false },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.ALERT_DELETE,
    entityType: "Alert",
    ip: input.actor.ip,
    metadata: { bulk: true, ids, count: result.count },
  });
  return { ok: true, count: result.count };
}

export type StorefrontAlert = {
  id: string;
  text: string;
  linkLabel: string | null;
  link: string | null;
  imagePath: string | null;
  size: AlertSize;
  backgroundColor: string;
  textTone: AlertTextTone;
  location: AlertLocation;
  autoCloseSeconds: number | null;
};

export async function getActiveAlertForStorefront(): Promise<StorefrontAlert | null> {
  const row = await getPrisma().alert.findFirst({
    where: { enabled: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: alertSelect,
  });
  return row ? toAdminAlert(row) : null;
}
