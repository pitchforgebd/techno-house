import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogListingBody } from "@/features/catalog/catalog-listing-body";
import {
  CATALOG_ATTRIBUTE_KEYS,
  LISTING_PAGE_SIZE,
  listingHasActiveFilters,
  parseListingQuery,
  resetListingHref,
  toListQueryFilters,
  type ListingSearchParams,
  type ParsedListingQuery,
} from "@/lib/catalog/listing-params";
import type { Brand } from "@/lib/data";
import { brandRepository, productRepository } from "@/lib/data";

export async function BrandListing({
  brand,
  searchParams,
}: {
  brand: Brand;
  searchParams: ListingSearchParams;
}) {
  const pathname = `/brand/${brand.slug}`;
  const parsed = parseListingQuery(searchParams, [...CATALOG_ATTRIBUTE_KEYS]);
  const listingParsed: ParsedListingQuery = {
    ...parsed,
    brandSlugs: [],
  };
  const [brands, result] = await Promise.all([
    brandRepository.list(),
    productRepository.list({
      brandSlug: brand.slug,
      sort: parsed.sort,
      page: parsed.page,
      pageSize: LISTING_PAGE_SIZE,
      ...toListQueryFilters(parsed, { showBrandFilter: false }),
    }),
  ]);

  const resetHref = resetListingHref(pathname);
  const filteredEmpty = listingHasActiveFilters(listingParsed);

  return (
    <div className="mx-auto max-w-[90rem] px-4 py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { href: "/brands", label: "Brands" },
          { label: brand.name },
        ]}
      />
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        {brand.name}
      </h1>
      <p className="mt-2 text-body text-text-muted">
        Products from this brand. Prices in ৳ are for display and are not a
        charge.
      </p>
      <CatalogListingBody
        pathname={pathname}
        preserved={{}}
        parsed={listingParsed}
        brands={brands}
        result={result}
        resetHref={resetHref}
        includeBrandFilter={false}
        emptyTitle={
          filteredEmpty ? "No matching products" : "No products from this brand"
        }
        emptyDescription={
          filteredEmpty
            ? "Try clearing filters or broadening the price range."
            : "Matching products will appear here when the catalog has items for this brand."
        }
      />
    </div>
  );
}
