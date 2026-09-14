"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  deleteCustomNotifications,
  sendCustomNotification,
  type NotificationMutationResult,
} from "@/lib/notifications/inbox";
import {
  saveNotificationSettings,
  type SaveResult as SaveSettingsResult,
} from "@/lib/notifications/global-settings";
import {
  bulkSetNotificationTypesEnabled,
  saveNotificationType,
  setNotificationTypeEnabled,
  type SaveResult as SaveTypeResult,
} from "@/lib/notifications/type-settings";
import { revalidatePath } from "next/cache";

async function guardOrigin(): Promise<NotificationMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

function revalidateNotifications() {
  revalidatePath("/admin/notifications");
  revalidatePath("/admin/notifications/custom");
  revalidatePath("/admin/notifications/history");
  revalidatePath("/account/notifications");
}

export async function sendCustomNotificationAction(input: {
  audience: string;
  type: string;
  content: string;
  link: string;
}): Promise<NotificationMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await sendCustomNotification({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateNotifications();
  }
  return result;
}

export async function saveNotificationTypeAction(input: {
  id?: string;
  name: string;
  defaultText: string;
}): Promise<SaveTypeResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveNotificationType({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/notifications/types");
  }
  return result;
}

export async function setNotificationTypeEnabledAction(input: {
  id: string;
  enabled: boolean;
}): Promise<SaveTypeResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setNotificationTypeEnabled({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/notifications/types");
  }
  return result;
}

export async function bulkSetNotificationTypesEnabledAction(input: {
  ids: string[];
  enabled: boolean;
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await bulkSetNotificationTypesEnabled({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  revalidatePath("/admin/notifications/types");
  return result;
}

export async function saveNotificationSettingsAction(input: {
  emailEnabled: boolean;
  smsEnabled: boolean;
  pushEnabled: boolean;
  fromName: string;
}): Promise<SaveSettingsResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveNotificationSettings({
    ...input,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  });
  if (result.ok) {
    revalidatePath("/admin/notifications/settings");
  }
  return result;
}

export async function deleteCustomNotificationsAction(input: {
  ids: string[];
}): Promise<NotificationMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("notifications.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteCustomNotifications({
    ids: input.ids,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateNotifications();
  }
  return result;
}
