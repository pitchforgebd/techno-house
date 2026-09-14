"use client";

import { useRouter } from "next/navigation";
import {
  LISTING_PAGE_SIZE_OPTIONS,
  listingHref,
  type ParsedListingQuery,
} from "@/lib/catalog/listing-params";

/**
 * "Show N per page" for a catalog listing.
 *
 * Sits to the left of the pagination so the two controls read as one decision:
 * show more, or page through. A shopper who picks 100 on a 42-product category
 * never sees pagination again, which is the point — the default of 20 was
 * turning a browse into a click-through.
 *
 * ## Why it resets to page one
 *
 * Page size and page number are not independent. On page 3 of 20-per-page you
 * are looking at products 41-60; switching to 100 per page would put those on
 * page 1, and staying on page 3 would land on products 201-300 — past the end
 * of most categories, showing an empty grid. Resetting is the only choice that
 * always leaves the shopper looking at something.
 *
 * ## Why a plain <select> and a navigation
 *
 * The listing is server-rendered and every other control here (sort, filters,
 * pagination) is URL-driven, so the page size belongs in the URL too: it makes
 * the view shareable, survives a refresh, and keeps the back button meaningful.
 * A client-side state toggle would do none of that.
 */
export function CatalogPageSizeControl({
  pathname,
  parsed,
  preserved,
  includeBrand,
}: {
  pathname: string;
  parsed: ParsedListingQuery;
  preserved: { q?: string };
  includeBrand: boolean;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-caption text-text-muted">
      <span>Show</span>
      <select
        value={parsed.pageSize}
        onChange={(event) => {
          router.push(
            listingHref(pathname, parsed, {
              q: preserved.q,
              includeBrand,
              pageSize: Number(event.target.value),
              // Back to the first page — see above.
              page: 1,
            }),
          );
        }}
        aria-label="Products per page"
        className="h-9 rounded-sm border border-border bg-surface px-2 text-caption text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {LISTING_PAGE_SIZE_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span>per page</span>
    </label>
  );
}
