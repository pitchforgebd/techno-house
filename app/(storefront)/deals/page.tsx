import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { ProductCard } from "@/features/catalog/product-card";
import { PRODUCT_CARD_GRID_CLASS } from "@/features/catalog/product-grid";
import { productRepository } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deals — Techno House",
};

/** Page size; the repository caps it at 48. */
const DEALS_PAGE_SIZE = 40;

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(page) && page >= 1 ? Math.min(page, 1000) : 1;
}

function dealsHref(page: number): string {
  return page <= 1 ? "/deals" : `/deals?page=${page}`;
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const page = parsePage((await searchParams).page);
  const result = await productRepository.list({
    sort: "discount",
    onSaleOnly: true,
    page,
    pageSize: DEALS_PAGE_SIZE,
  });
  const pageCount = Math.max(1, Math.ceil(result.total / result.pageSize));

  // A page number past the end (a stale link after products were removed):
  // send the visitor to the last real page instead of showing an empty grid.
  if (result.items.length === 0 && result.total > 0 && page > pageCount) {
    redirect(dealsHref(pageCount));
  }

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Deals</h1>
      <p className="mt-2 text-body text-text-muted">
        Products flagged for today&apos;s deal. Sale prices on cards are
        display-only until checkout recalculates them.
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Current deals"
          description="Sale products will appear here when a deal is listed."
        />
      ) : (
        <>
          <ul className={`mt-6 ${PRODUCT_CARD_GRID_CLASS}`}>
            {result.items.map((product) => (
              <li key={product.id} className="min-w-0">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          {pageCount > 1 ? (
            <div className="mt-8 flex justify-end border-t border-border pt-6">
              <Pagination
                page={result.page}
                pageCount={pageCount}
                hrefForPage={dealsHref}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
