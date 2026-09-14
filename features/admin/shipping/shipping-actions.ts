"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import { saveShippingArea, saveShippingZone } from "@/lib/shipping/locations";
import {
  saveShippingMethod,
  type ShippingMutationResult,
} from "@/lib/shipping/methods";
import { revalidatePath } from "next/cache";

function revalidateShipping() {
  revalidatePath("/admin/shipping");
  revalidatePath("/admin/shipping/zones");
  revalidatePath("/admin/shipping/areas");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  revalidatePath("/", "layout");
}

export async function saveShippingMethodAction(input: {
  id: string;
  name: string;
  description: string;
  baseRate: string;
  isPickup: boolean;
  isActive: boolean;
}): Promise<ShippingMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("shipping_method.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveShippingMethod({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateShipping();
  }
  return result;
}

export async function saveShippingZoneAction(input: {
  id: string;
  name: string;
  isActive: boolean;
}): Promise<ShippingMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("zones.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveShippingZone({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateShipping();
  }
  return result;
}

export async function saveShippingAreaAction(input: {
  id: string;
  name: string;
  isActive: boolean;
}): Promise<ShippingMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("areas.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveShippingArea({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateShipping();
  }
  return result;
}
