"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveFacebookCatalogId,
  saveGa4Config,
  saveGtmConfig,
  saveMerchantCenterConfig,
  saveMetaPixelConfig,
  type AnalyticsMutationResult,
} from "@/lib/analytics/config";
import { revalidatePath } from "next/cache";

async function guardOrigin(): Promise<AnalyticsMutationResult | null> {
  if (await isSameOriginRequest()) {
    return null;
  }
  return { ok: false, formError: CROSS_ORIGIN_ERROR };
}

function revalidateAnalytics() {
  revalidatePath("/admin/integrations/ga4");
  revalidatePath("/admin/integrations/gtm");
  revalidatePath("/admin/integrations/meta");
  revalidatePath("/admin/integrations/meta-capi");
  revalidatePath("/admin/integrations/facebook-catalog");
  revalidatePath("/admin/integrations/facebook-catalog/feed");
  revalidatePath("/admin/integrations/merchant-center");
  revalidatePath("/admin/integrations/merchant-center/feed");
  revalidatePath("/admin/analytics");
  revalidatePath("/", "layout");
}

export async function saveGa4ConfigAction(input: {
  isEnabled: boolean;
  publicId: string;
  propertyId: string;
}): Promise<AnalyticsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("ga4.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveGa4Config({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateAnalytics();
  }
  return result;
}

export async function saveGtmConfigAction(input: {
  isEnabled: boolean;
  publicId: string;
}): Promise<AnalyticsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("gtm.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveGtmConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateAnalytics();
  }
  return result;
}

export async function saveMetaPixelConfigAction(input: {
  isEnabled: boolean;
  publicId: string;
}): Promise<AnalyticsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("meta.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveMetaPixelConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateAnalytics();
  }
  return result;
}

export async function saveFacebookCatalogIdAction(input: {
  catalogId: string;
}): Promise<AnalyticsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("meta.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveFacebookCatalogId({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateAnalytics();
  }
  return result;
}

export async function saveMerchantCenterConfigAction(input: {
  isEnabled: boolean;
  publicId: string;
}): Promise<AnalyticsMutationResult> {
  const blocked = await guardOrigin();
  if (blocked) {
    return blocked;
  }
  const allowed = await staffWithPermission("merchant.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveMerchantCenterConfig({
    ...input,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidateAnalytics();
  }
  return result;
}
