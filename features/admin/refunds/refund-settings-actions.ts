"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { uploadAdminMediaFiles } from "@/lib/media/admin-media";
import {
  bulkUpdateRefundReasons,
  createRefundReason,
  deleteRefundReason,
  getRefundPolicySettings,
  saveRefundPolicySettings,
  setRefundReasonActive,
  type RefundSettingsMutationResult,
  type RefundTypeMode,
} from "@/lib/refunds/settings";

async function guard(): Promise<RefundSettingsMutationResult | null> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  return null;
}

function revalidateRefundSettings() {
  revalidatePath("/admin/refunds/settings");
  revalidatePath("/admin/refunds/categories");
  revalidatePath("/admin/refunds/reasons");
  revalidatePath("/admin/refunds");
  revalidatePath("/account", "layout");
  revalidatePath("/", "layout");
}

export async function saveRefundPolicyAction(input: {
  refundType: RefundTypeMode;
  globalRefundDays: number;
  disputeEnabled: boolean;
  disputeDays: number;
  stickerSrc?: string | null;
}): Promise<RefundSettingsMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveRefundPolicySettings({
    refundType: input.refundType,
    globalRefundDays: input.globalRefundDays,
    disputeEnabled: input.disputeEnabled,
    disputeDays: input.disputeDays,
    stickerSrc: input.stickerSrc,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateRefundSettings();
  }
  return result;
}

export async function saveCategoryRefundDaysAction(input: {
  categoryDays: Record<string, number>;
}): Promise<RefundSettingsMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const current = await getRefundPolicySettings();
  const result = await saveRefundPolicySettings({
    refundType: current.refundType,
    globalRefundDays: current.globalRefundDays,
    disputeEnabled: current.disputeEnabled,
    disputeDays: current.disputeDays,
    categoryDays: input.categoryDays,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateRefundSettings();
  }
  return result;
}

export async function createRefundReasonAction(input: {
  type: "customer" | "admin_reject";
  reason: string;
}): Promise<RefundSettingsMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await createRefundReason({
    type: input.type,
    reason: input.reason,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateRefundSettings();
  }
  return result;
}

export async function deleteRefundReasonAction(input: {
  id: string;
}): Promise<RefundSettingsMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await deleteRefundReason({
    id: input.id,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateRefundSettings();
  }
  return result;
}

export async function setRefundReasonActiveAction(input: {
  id: string;
  isActive: boolean;
}): Promise<RefundSettingsMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setRefundReasonActive({
    id: input.id,
    isActive: input.isActive,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateRefundSettings();
  }
  return result;
}

export async function bulkUpdateRefundReasonsAction(input: {
  ids: string[];
  action: "enable" | "disable" | "delete";
}): Promise<RefundSettingsMutationResult> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await bulkUpdateRefundReasons({
    ids: input.ids,
    action: input.action,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateRefundSettings();
  }
  return result;
}

export async function uploadRefundStickerAction(
  formData: FormData,
): Promise<RefundSettingsMutationResult & { path?: string }> {
  const blocked = await guard();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("refunds.settings");
  if (!allowed.ok) {
    return allowed;
  }
  const file = formData.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return { ok: false, formError: "Choose an image file." };
  }
  const meta = await getRequestMeta();
  const uploaded = await uploadAdminMediaFiles({
    files: [file],
    folder: "general",
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (!uploaded.ok) {
    return { ok: false, formError: uploaded.formError };
  }
  const path = uploaded.path;
  if (!path) {
    return { ok: false, formError: "Upload failed." };
  }
  const current = await getRefundPolicySettings();
  const result = await saveRefundPolicySettings({
    refundType: current.refundType,
    globalRefundDays: current.globalRefundDays,
    disputeEnabled: current.disputeEnabled,
    disputeDays: current.disputeDays,
    stickerSrc: path,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (!result.ok) {
    return result;
  }
  revalidateRefundSettings();
  return { ok: true, id: result.id, path };
}
