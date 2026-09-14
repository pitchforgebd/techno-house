"use server";

import {
  createAdminCustomReview,
  deleteAdminReview,
  deleteAdminReviewsForProduct,
  moderateAdminReview,
  type ReviewMutationResult,
} from "@/lib/catalog/admin-reviews";
import {
  parseReviewStatus,
  type StaffReviewInputFields,
} from "@/lib/catalog/review-input";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";

async function guardOrigin(): Promise<ReviewMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function createAdminCustomReviewAction(
  fields: StaffReviewInputFields,
): Promise<ReviewMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("reviews.add");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return createAdminCustomReview({
    fields,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function moderateAdminReviewAction(input: {
  id: string;
  status: string;
}): Promise<ReviewMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("reviews.moderate");
  if (!allowed.ok) {
    return allowed;
  }
  const status = parseReviewStatus(input.status);
  if (!status || status === "pending") {
    return { ok: false, formError: "Choose publish or reject." };
  }
  const meta = await getRequestMeta();
  return moderateAdminReview({
    id: input.id,
    status,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function deleteAdminReviewAction(
  id: string,
): Promise<ReviewMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("reviews.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return deleteAdminReview({
    id,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}

export async function deleteAdminReviewsForProductAction(
  productSlug: string,
): Promise<ReviewMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("reviews.delete");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return deleteAdminReviewsForProduct({
    productSlug,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
}
