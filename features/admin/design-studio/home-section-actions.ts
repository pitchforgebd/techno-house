"use server";

import { revalidatePath } from "next/cache";
import { getRequestMeta } from "@/lib/auth/request-meta";
import { staffWithPermission } from "@/lib/auth/permissions";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  saveHomeSection,
  searchHomeSectionCandidates,
  type HomeSectionItem,
  type HomeSectionMutationResult,
} from "@/lib/marketing/home-sections";

export async function saveHomeSectionAction(input: {
  section: string;
  productIds: string[];
}): Promise<HomeSectionMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return allowed;
  }
  const meta = await getRequestMeta();
  const result = await saveHomeSection({
    section: input.section,
    productIds: input.productIds,
    actor: {
      staffId: allowed.session.staffId,
      email: allowed.session.email,
      ip: meta.ip,
    },
  });
  if (result.ok) {
    revalidatePath("/");
    revalidatePath("/admin/design-studio/home-products");
  }
  return result;
}

/** Picker search for the Homepage products screen; returns nothing for anyone who cannot edit it. */
export async function searchHomeSectionProductsAction(
  query: string,
): Promise<HomeSectionItem[]> {
  if (!(await isSameOriginRequest())) {
    return [];
  }
  const allowed = await staffWithPermission("design_studio.manage");
  if (!allowed.ok) {
    return [];
  }
  return searchHomeSectionCandidates({ query: String(query ?? "") });
}
