"use server";

import { revalidatePath } from "next/cache";
import {
  bulkDeletePopups,
  bulkSetPopupsEnabled,
  savePopup,
  setPopupEnabled,
  type SaveResult,
} from "@/lib/marketing/popups";
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
  revalidatePath("/admin/marketing/popups");
  revalidatePath("/", "layout");
}

export async function savePopupAction(formData: FormData): Promise<SaveResult> {
  const gate = await actorOrReject("popups.manage");
  if (!gate.ok) {
    return gate;
  }
  const id = String(formData.get("id") ?? "").trim() || undefined;
  const imageFile = formData.get("image") as File | null;
  const result = await savePopup({
    id,
    title: String(formData.get("title") ?? ""),
    summary: String(formData.get("summary") ?? ""),
    buttonText: String(formData.get("buttonText") ?? ""),
    buttonColor: String(formData.get("buttonColor") ?? "#eab308"),
    buttonTextTone: formData.get("buttonTextTone") === "light" ? "light" : "dark",
    link: String(formData.get("link") ?? ""),
    delaySeconds: Number.parseInt(String(formData.get("delaySeconds") ?? "3"), 10),
    imageFile: imageFile && imageFile.size > 0 ? imageFile : null,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidate();
  }
  return result;
}

export async function setPopupEnabledAction(input: {
  id: string;
  enabled: boolean;
}): Promise<SaveResult> {
  const gate = await actorOrReject("popups.manage");
  if (!gate.ok) {
    return gate;
  }
  const result = await setPopupEnabled({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidate();
  }
  return result;
}

export async function bulkSetPopupsEnabledAction(input: {
  ids: string[];
  enabled: boolean;
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  const gate = await actorOrReject("popups.manage");
  if (!gate.ok) {
    return gate;
  }
  const result = await bulkSetPopupsEnabled({ ...input, actor: gate.actor });
  revalidate();
  return result;
}

export async function bulkDeletePopupsAction(input: {
  ids: string[];
}): Promise<{ ok: true; count: number } | { ok: false; formError: string }> {
  const gate = await actorOrReject("popups.manage");
  if (!gate.ok) {
    return gate;
  }
  const result = await bulkDeletePopups({ ...input, actor: gate.actor });
  revalidate();
  return result;
}
