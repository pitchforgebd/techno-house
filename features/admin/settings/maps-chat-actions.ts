"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveChatWidgetConfig,
  type ChatMutationResult,
} from "@/lib/chat/config";
import {
  saveCommentSystemConfig,
  type CommentsMutationResult,
} from "@/lib/comments/config";
import { saveGoogleMapConfig, type MapMutationResult } from "@/lib/maps/config";
import { revalidatePath } from "next/cache";

export async function saveGoogleMapConfigAction(input: {
  isEnabled: boolean;
}): Promise<MapMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("google_map.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveGoogleMapConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings/google/map");
  }
  return result;
}

export async function saveChatWidgetConfigAction(input: {
  provider: string;
  isEnabled: boolean;
  publicHandle: string;
}): Promise<ChatMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("chat_widgets.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveChatWidgetConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings/chat");
  }
  return result;
}

export async function saveCommentSystemConfigAction(input: {
  isEnabled: boolean;
  provider: string;
  publicAppId: string;
}): Promise<CommentsMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("comment_system.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveCommentSystemConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/settings/comments");
  }
  return result;
}
