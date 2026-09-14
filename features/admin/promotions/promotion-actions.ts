"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveCategoryDiscount,
  type CategoryDiscountMutationResult,
} from "@/lib/marketing/category-discounts";
import {
  assignPromotionalProducts,
  removePromotionalProduct,
  removePromotionalProducts,
  setPromotionalProductFlag,
  type PromotionalActor,
  type PromotionalMutationResult,
} from "@/lib/marketing/promotional-products";
import {
  savePromotion,
  type PromotionMutationResult,
} from "@/lib/marketing/promotions";

type GuardResult =
  | { ok: true; actor: PromotionalActor }
  | { ok: false; formError: string };

/**
 * Same guard order and permission key as the Today's Deal actions
 * (`features/admin/deals/deal-actions.ts`) — both are promotion channels.
 */
async function guard(): Promise<GuardResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  return {
    ok: true,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  };
}

function revalidatePromotions() {
  revalidatePath("/admin/promotions/products");
  revalidatePath("/admin/promotions");
}

export async function assignPromotionalProductsAction(
  productIds: string[],
): Promise<PromotionalMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await assignPromotionalProducts({
    productIds,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidatePromotions();
  }
  return result;
}

export async function removePromotionalProductAction(
  productId: string,
): Promise<PromotionalMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await removePromotionalProduct({
    productId,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidatePromotions();
  }
  return result;
}

export async function bulkRemovePromotionalProductsAction(
  productIds: string[],
): Promise<PromotionalMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await removePromotionalProducts({
    productIds,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidatePromotions();
  }
  return result;
}

export async function setPromotionalProductFlagAction(
  productId: string,
  on: boolean,
): Promise<PromotionalMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await setPromotionalProductFlag({
    productId,
    on,
    actor: gate.actor,
  });
  if (result.ok) {
    revalidatePromotions();
  }
  return result;
}

/** Promotion campaigns (`/admin/promotions/campaigns`) — gated on its own key. */
export async function savePromotionAction(input: {
  id?: string;
  name: string;
  slug: string;
  status: string;
  channel: string;
  startsAt: string;
  endsAt: string;
  summary: string;
  priority: string;
  bannerSrc?: string;
  bannerLabel?: string;
  bannerHref?: string;
}): Promise<PromotionMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("promotion.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await savePromotion({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/promotions/campaigns");
    revalidatePath("/admin/promotions");
  }
  return result;
}

export async function saveCategoryDiscountAction(input: {
  categorySlug: string;
  discountPercent: string;
  startsAt?: string | null;
  endsAt?: string | null;
}): Promise<CategoryDiscountMutationResult> {
  const gate = await guard();
  if (!gate.ok) {
    return gate;
  }
  const result = await saveCategoryDiscount({ ...input, actor: gate.actor });
  if (result.ok) {
    revalidatePath("/admin/promotions/category-discounts");
    revalidatePath("/admin/promotions");
  }
  return result;
}
