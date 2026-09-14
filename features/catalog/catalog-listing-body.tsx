import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { CatalogFiltersForm } from "@/features/catalog/catalog-filters-form";
import { CatalogFiltersMobile } from "@/features/catalog/catalog-filters-mobile";
import { CatalogSortControl } from "@/features/catalog/catalog-sort-control";
import { ProductGrid } from "@/features/catalog/product-grid";
import { CatalogPageSizeControl } from "@/features/catalog/catalog-page-size-control";
import {
  listingHref,
  type ParsedListingQuery,
} from "@/lib/catalog/listing-params";
import type { Brand, ProductListResult } from "@/lib/data";

export function CatalogListingBody({
  pathname,
  preserved,
  parsed,
  brands,
  result,
  resetHref,
  includeBrandFilter,
  emptyTitle,
  emptyDescription,
  hideSort = false,
  filterHeading = "Filters",
}: {
  pathname: string;
  preserved: { q?: string };
  parsed: ParsedListingQuery;
  brands: Brand[];
  result: ProductListResult;
  resetHref: string;
  includeBrandFilter: boolean;
  emptyTitle: string;
  emptyDescription: string;
  hideSort?: boolean;
  filterHeading?: string;
}) {
  const formProps = {
    pathname,
    preserved,
    parsed,
    facets: result.facets,
    brands,
    resetHref,
    sort: parsed.sort,
  };

  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <div className="mt-4 grid items-start gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-7">
      <aside className="hidden lg:block">
        <div className="overflow-hidden border border-border bg-surface">
          <div className="flex items-center justify-between gap-2 bg-primary px-3.5 py-2.5 text-primary-foreground">
            <h2 className="text-[0.8125rem] font-semibold uppercase tracking-[0.04em]">
              {filterHeading}
            </h2>
            <Link
              href={resetHref}
              className="text-caption font-medium text-primary-foreground/85 underline-offset-2 hover:text-primary-foreground hover:underline"
            >
              Reset
            </Link>
          </div>
          <div className="px-3.5 py-4">
            <CatalogFiltersForm
              {...formProps}
              idPrefix="desk"
              hideReset
              compact
            />
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 lg:mb-4">
          <CatalogFiltersMobile>
            <CatalogFiltersForm {...formProps} idPrefix="mobile" />
          </CatalogFiltersMobile>
          {hideSort && result.total > 0 ? (
            <p className="text-caption text-text-muted">
              Showing {result.items.length} of {result.total}
              {pageCount > 1 ? ` · Page ${result.page} of ${pageCount}` : null}
            </p>
          ) : null}
          {!hideSort ? (
            <div className="flex flex-wrap items-center gap-3">
              {result.total > 0 ? (
                <p className="text-caption text-text-muted">
                  Showing {result.items.length} of {result.total} products
                  {pageCount > 1
                    ? ` · Page ${result.page} of ${pageCount}`
                    : null}
                </p>
              ) : null}
              <CatalogSortControl
                pathname={pathname}
                parsed={parsed}
                preserved={preserved}
                includeBrand={includeBrandFilter}
              />
            </div>
          ) : null}
        </div>

        {result.total === 0 ? (
          <EmptyState title={emptyTitle} description={emptyDescription} />
        ) : (
          <>
            <ProductGrid
              products={result.items}
              density="comfortable"
              card="detailed"
            />
            {/* The page-size control stays visible even when everything fits on
                one page — that is exactly when a shopper wants to go the other
                way and see fewer. Pagination is the part that disappears. */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <CatalogPageSizeControl
                pathname={pathname}
                parsed={parsed}
                preserved={preserved}
                includeBrand={includeBrandFilter}
              />
              {pageCount > 1 ? (
                <Pagination
                  page={result.page}
                  pageCount={pageCount}
                  hrefForPage={(page) =>
                    listingHref(pathname, parsed, {
                      q: preserved.q,
                      includeBrand: includeBrandFilter,
                      page,
                    })
                  }
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
