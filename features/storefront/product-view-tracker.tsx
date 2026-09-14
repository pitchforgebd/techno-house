"use client";

import { useEffect } from "react";
import { recordProductViewAction } from "@/features/storefront/product-view-actions";

/** Fire-and-forget: records one real page-view event on mount. */
export function ProductViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordProductViewAction(slug).catch(() => {});
  }, [slug]);

  return null;
}
