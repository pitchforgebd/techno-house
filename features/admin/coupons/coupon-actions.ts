"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { saveCoupon, type CouponMutationResult } from "@/lib/marketing/coupons";
import { revalidatePath } from "next/cache";

async function guardOrigin(): Promise<CouponMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

export async function saveCouponAction(input: {
  id?: string;
  code: string;
  kind: string;
  value: string;
  label: string;
  status: string;
  usageLimit: string;
  perUserLimit: string;
  minSpend: string;
  startsAt: string;
  endsAt: string;
}): Promise<CouponMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const permission = input.id?.trim() ? "coupons.edit" : "coupons.add";
  const allowed = await staffWithPermission(permission);
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveCoupon({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/admin/coupons");
    revalidatePath("/admin/promotions");
    revalidatePath("/cart");
    revalidatePath(`/admin/coupons/${result.id}`);
  }
  return result;
}
