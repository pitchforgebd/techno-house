"use server";

import { getOrCreateVisitorId } from "@/lib/analytics/visitor-id";
import { recordProductView } from "@/lib/analytics/product-views";
import { isSameOriginRequest } from "@/lib/auth/same-origin";

export async function recordProductViewAction(productSlug: string): Promise<void> {
  if (!(await isSameOriginRequest())) {
    return;
  }
  const slug = productSlug.trim();
  if (!slug) {
    return;
  }
  const viewerKey = await getOrCreateVisitorId();
  await recordProductView({ productSlug: slug, viewerKey });
}
