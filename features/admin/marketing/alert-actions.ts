"use server";

import { revalidatePath } from "next/cache";
import {
  bulkDeleteAlerts,
  bulkSetAlertsEnabled,
  saveAlert,
  setAlertEnabled,
  type SaveResult,
} from "@/lib/marketing/alerts";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import { CROSS_ORIGIN_ERROR, isSameOriginRequest } from "@/lib/auth/same-origin";

async function actorOrReject(permission: string) {
  if (!(await isSameOriginRequest())) {
    return { ok: false as const, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true as const,
    actor: { staffId: allowed.session.staffId, email: allowed.session.email, ip: meta.ip },
  };
}

function revalidate() {
  revalidatePath("/admin/marketing/alerts");
  revalidatePath("/", "layout");
}

export async function saveAlertAction(formData: FormData): Promise<SaveResult> {
  const gate = await actorOrReject("alerts.manage");
  if (!gate.ok) {
    return gate;
  }
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const imageFile = formData.get("image") as File | null;
  const autoCloseRaw = String(formData.get("autoCloseSeconds") ?? "");
  const result = await saveAlert({
    id,
    text: String(formData.get("text") ?? ""),
    linkLabel: String(formData.get("linkLabel") ?? ""),
    link: String(formData.get("link") ?? ""),
    size: formData.get("size") === "large" ? "large" : "small",
    backgroundColor: String(formData.get("backgroundColor") ?? "#000000"),
    textTone: formData.get("textTone") === "dark" ? "dark" : "light",
    location:
      (["bottom-left", "bottom-right", "top-left", "top-right"] as const).find(
        (value) => value === formData.get("location"),
      ) ?? "bottom-left",
    autoCloseSeconds: autoCloseRaw === "disabled" || !autoCloseRaw
      ? null
      : Number.parseInt(autoCloseRaw, 10),
    imageFile: imageFile && imageFile.size > 0 ? imageFile : null,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidate();
  }
  return result;
}

export async function setAlertEnabledAction(input: {
  id: string;
  enabled: boolean;
}): Promise<SaveResult> {
  const gate = await actorOrReject("alerts.manage");
  if (!gate.ok) {
    return gate;
  }
  const result = await setAlertEnabled({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate();
  }
  return result;
}

export async function bulkSetAlertsEnabledAction(input: {
  ids: string[];
  enabled: boolean;
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  const gate = await actorOrReject("alerts.manage");
  if (!gate.ok) {
    return gate;
  }
  const result = await bulkSetAlertsEnabled({ ...input, actor: gate.actor });
  revalidate();
  return result;
}

export async function bulkDeleteAlertsAction(input: {
  ids: string[];
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  const gate = await actorOrReject("alerts.manage");
  if (!gate.ok) {
    return gate;
  }
  const result = await bulkDeleteAlerts({ ...input, actor: gate.actor });
  revalidate();
  return result;
}
