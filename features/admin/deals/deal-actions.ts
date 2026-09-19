"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  setTodaysDealFlag,
  type DealMutationResult,
} from "@/lib/marketing/deals";
import { revalidatePath } from "next/cache";

async function guardOrigin(): Promise<DealMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function setTodaysDealFlagAction(input: {
  productIds: string[];
  on: boolean;
}): Promise<DealMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("flash_deals.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await setTodaysDealFlag({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/deals");
    revalidatePath("/admin/promotions");
    revalidatePath("/deals");
  }
  return result;
}

/** Bound signatures safe to pass into Client Components as server actions. */
export async function assignTodaysDealProductsAction(
  productIds: string[],
): Promise<DealMutationResult> {
  return setTodaysDealFlagAction({ productIds, on: true });
}

export async function removeTodaysDealProductAction(
  productId: string,
): Promise<DealMutationResult> {
  return setTodaysDealFlagAction({ productIds: [productId], on: false });
}

export async function bulkRemoveTodaysDealProductsAction(
  productIds: string[],
): Promise<DealMutationResult> {
  return setTodaysDealFlagAction({ productIds, on: false });
}

export async function setTodaysDealProductFlagAction(
  productId: string,
  on: boolean,
): Promise<DealMutationResult> {
  return setTodaysDealFlagAction({ productIds: [productId], on });
}
