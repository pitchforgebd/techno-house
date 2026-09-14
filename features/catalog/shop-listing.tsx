import { Breadcrumbs } from "@/components/ui/breadcrumbs";
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

const PATHNAME = "/shop";

export async function ShopListing({
  searchParams,
}: {
  searchParams: ListingSearchParams;
}) {
  const [brands, attributeKeys] = await Promise.all([
    brandRepository.list(),
    listStorefrontFilterKeys(),
  ]);
  const parsed = parseListingQuery(searchParams, attributeKeys);
  const result = await productRepository.list({
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsed.pageSize,
    ...toListQueryFilters(parsed, { showBrandFilter: true }),
  });

  const resetHref = resetListingHref(PATHNAME);
  const filteredEmpty = listingHasActiveFilters(parsed);

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8">
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Shop" }]} />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Shop</h1>
      <p className="mt-2 text-body text-text-muted">
        All products. Prices in ৳ are for display and are not a charge.
      </p>
      <CatalogListingBody
        pathname={PATHNAME}
        preserved={{}}
        parsed={parsed}
        brands={brands}
        result={result}
        resetHref={resetHref}
        includeBrandFilter
        emptyTitle={filteredEmpty ? "No matching products" : "No products yet"}
        emptyDescription={
          filteredEmpty
            ? "Try clearing filters or broadening price and brand."
            : "Products will appear here when the catalog is available."
        }
      />
    </div>
  );
}
