import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogListingBody } from "@/features/catalog/catalog-listing-body";
import { listStorefrontFilterKeys } from "@/lib/catalog/filter-keys";
import {
  listingHasActiveFilters,
  parseListingQuery,
  resetListingHref,
  toListQueryFilters,
  type ListingSearchParams,
} from "@/lib/catalog/listing-params";
import { brandRepository, productRepository } from "@/lib/data";
import { recordSearchQuery } from "@/lib/search/log-search";

const PATHNAME = "/search";

export async function SearchListing({
  q,
  searchParams,
}: {
  q: string;
  searchParams: ListingSearchParams;
}) {
  if (!q) {
    return (
      <div className="mx-auto max-w-content px-4 py-8">
        <Breadcrumbs
          items={[
            { href: "/", label: "Home" },
            { href: "/shop", label: "Shop" },
            { label: "Search" },
          ]}
        />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Search</h1>
        <EmptyState
          className="mt-6"
          title="Search the catalog"
          description="Use the search field in the header to look up a product, brand, or SKU."
        />
      </div>
    );
  }

  const [attributeKeys, brands] = await Promise.all([
    listStorefrontFilterKeys(),
    brandRepository.list(),
  ]);
  const parsed = parseListingQuery(searchParams, attributeKeys);
  const result = await productRepository.list({
    q,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsed.pageSize,
    ...toListQueryFilters(parsed, { showBrandFilter: true }),
  });

  await recordSearchQuery({ query: q, resultCount: result.total });

  const resetHref = resetListingHref(PATHNAME, { q });
  const filteredEmpty = listingHasActiveFilters(parsed);

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { label: "Search" },
        ]}
      />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Search</h1>
      <p className="mt-2 text-body text-text-muted">
        Results for “{q}”. Prices in ৳ are for display and are not a
        charge.
      </p>
      <CatalogListingBody
        pathname={PATHNAME}
        preserved={{ q }}
        parsed={parsed}
        brands={brands}
        result={result}
        resetHref={resetHref}
        includeBrandFilter
        emptyTitle="No matching products"
        emptyDescription={
          filteredEmpty
            ? "Try clearing filters, or search another name, brand, or SKU."
            : "Try another name, brand, or SKU, or browse the full shop."
        }
      />
    </div>
  );
}
