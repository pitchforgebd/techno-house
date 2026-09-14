"use server";

import {
  answerAdminQuestion,
  deleteAdminQuestion,
  type QuestionMutationResult,
} from "@/lib/catalog/admin-questions";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

async function guardOrigin(): Promise<QuestionMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function answerAdminQuestionAction(input: {
  id: string;
  answer: string;
}): Promise<QuestionMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("questions.answer");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return answerAdminQuestion({
    id: input.id,
    answer: input.answer,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      fullName: allowed.session.fullName,
      ip: meta.ip,
    },
  });
}

export async function deleteAdminQuestionAction(
  id: string,
): Promise<QuestionMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("questions.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return deleteAdminQuestion({
    id,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      fullName: allowed.session.fullName,
      ip: meta.ip,
    },
  });
}
