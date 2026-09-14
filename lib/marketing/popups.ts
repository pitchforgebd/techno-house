/**
 * Dynamic pop-ups (Admin → Marketing → Dynamic Pop-ups, AD-258). Real
 * Postgres CRUD; rendered for real on the storefront via
 * `getActivePopupForStorefront()`.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { getPrisma } from "@/lib/db/prisma";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";

export type AdminPopup = {
  id: string;
  title: string;
  summary: string;
  imagePath: string | null;
  buttonText: string | null;
  buttonColor: string;
  buttonTextTone: "light" | "dark";
  link: string | null;
  delaySeconds: number;
  enabled: boolean;
  isLocked: boolean;
};

type Actor = { staffId: string; email: string; ip?: string | null };

function toTone(value: string): "light" | "dark" {
  return value === "light" ? "light" : "dark";
}

function toAdminPopup(row: {
  id: string;
  title: string;
  summary: string;
  imagePath: string | null;
  buttonText: string | null;
  buttonColor: string;
  buttonTextTone: string;
  link: string | null;
  delaySeconds: number;
  enabled: boolean;
  isLocked: boolean;
}): AdminPopup {
  return { ...row, buttonTextTone: toTone(row.buttonTextTone) };
}

const popupSelect = {
  id: true,
  title: true,
  summary: true,
  imagePath: true,
  buttonText: true,
  buttonColor: true,
  buttonTextTone: true,
  link: true,
  delaySeconds: true,
  enabled: true,
  isLocked: true,
} as const;

export async function listAdminPopups(): Promise<AdminPopup[]> {
  const rows = await getPrisma().popup.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    select: popupSelect,
  });
  return rows.map(toAdminPopup);
}

export async function getAdminPopup(id: string): Promise<AdminPopup | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().popup.findUnique({
    where: { id: trimmed },
    select: popupSelect,
  });
  return row ? toAdminPopup(row) : null;
}

export type SaveResult = { ok: true; id: string } | { ok: false; formError: string };

export async function savePopup(input: {
  id?: string;
  title: string;
  summary: string;
  buttonText: string;
  buttonColor: string;
  buttonTextTone: "light" | "dark";
  link: string;
  delaySeconds: number;
  imageFile?: File | null;
  actor: Actor;
}): Promise<SaveResult> {
  const title = input.title.trim().slice(0, 50);
  if (!title) {
    return { ok: false, formError: "Enter a title." };
  }
  const summary = input.summary.trim().slice(0, 200);
  if (!summary) {
    return { ok: false, formError: "Enter a summary." };
  }
  const delaySeconds = Number.isFinite(input.delaySeconds)
    ? Math.max(0, Math.min(120, Math.round(input.delaySeconds)))
    : 3;
  const buttonColor = /^#[0-9a-fA-F]{3,8}$/.test(input.buttonColor)
    ? input.buttonColor
    : "#eab308";

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
    title,
    summary,
    buttonText: input.buttonText.trim().slice(0, 30) || null,
    buttonColor,
    buttonTextTone: input.buttonTextTone,
    link: input.link.trim().slice(0, 300) || null,
    delaySeconds,
    ...(imagePath ? { imagePath } : {}),
  };

  if (input.id) {
    const existing = await prisma.popup.findUnique({
      where: { id: input.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, formError: "That pop-up no longer exists." };
    }
    await prisma.popup.update({ where: { id: existing.id }, data });
    await writeAuditLog({
      actorType: "STAFF",
      actorId: input.actor.staffId,
      actorLabel: input.actor.email,
      action: AUDIT_ACTIONS.POPUP_UPDATE,
      entityType: "Popup",
      entityId: existing.id,
      ip: input.actor.ip,
    });
    return { ok: true, id: existing.id };
  }

  const created = await prisma.popup.create({
    data: { ...data, enabled: false, imagePath: imagePath ?? null },
    select: { id: true },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.POPUP_CREATE,
    entityType: "Popup",
    entityId: created.id,
    ip: input.actor.ip,
  });
  return { ok: true, id: created.id };
}

export async function setPopupEnabled(input: {
  id: string;
  enabled: boolean;
  actor: Actor;
}): Promise<SaveResult> {
  const existing = await getPrisma().popup.findUnique({
    where: { id: input.id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, formError: "That pop-up no longer exists." };
  }
  await getPrisma().popup.update({
    where: { id: existing.id },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.POPUP_UPDATE,
    entityType: "Popup",
    entityId: existing.id,
    ip: input.actor.ip,
    metadata: { enabled: input.enabled },
  });
  return { ok: true, id: existing.id };
}

export async function bulkSetPopupsEnabled(input: {
  ids: string[];
  enabled: boolean;
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const result = await getPrisma().popup.updateMany({
    where: { id: { in: ids }, isLocked: false },
    data: { enabled: input.enabled },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.POPUP_UPDATE,
    entityType: "Popup",
    ip: input.actor.ip,
    metadata: { bulk: true, enabled: input.enabled, ids, count: result.count },
  });
  return { ok: true, count: result.count };
}

export async function bulkDeletePopups(input: {
  ids: string[];
  actor: Actor;
}): Promise<{ ok: true; count: number }> {
  const ids = [...new Set(input.ids)].slice(0, 500);
  const result = await getPrisma().popup.deleteMany({
    where: { id: { in: ids }, isLocked: false },
  });
  await writeAuditLog({
    actorType: "STAFF",
    actorId: input.actor.staffId,
    actorLabel: input.actor.email,
    action: AUDIT_ACTIONS.POPUP_DELETE,
    entityType: "Popup",
    ip: input.actor.ip,
    metadata: { bulk: true, ids, count: result.count },
  });
  return { ok: true, count: result.count };
}

export type StorefrontPopup = {
  id: string;
  title: string;
  summary: string;
  imagePath: string | null;
  buttonText: string | null;
  buttonColor: string;
  buttonTextTone: "light" | "dark";
  link: string | null;
  delaySeconds: number;
};

export async function getActivePopupForStorefront(): Promise<StorefrontPopup | null> {
  const row = await getPrisma().popup.findFirst({
    where: { enabled: true },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      summary: true,
      imagePath: true,
      buttonText: true,
      buttonColor: true,
      buttonTextTone: true,
      link: true,
      delaySeconds: true,
    },
  });
  return row ? { ...row, buttonTextTone: toTone(row.buttonTextTone) } : null;
}
