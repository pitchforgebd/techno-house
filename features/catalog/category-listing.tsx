import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CatalogListingBody } from "@/features/catalog/catalog-listing-body";
import { CategoryBrandPills } from "@/features/catalog/category-brand-pills";
import { CategoryListingBar } from "@/features/catalog/category-listing-bar";
import { CategoryPageSeo } from "@/features/catalog/category-page-seo";
import { getCategoryPageContent } from "@/lib/catalog/category-page-content";
import {
  BRAND_FACET_KEY,
  CATALOG_ATTRIBUTE_KEYS,
  LISTING_PAGE_SIZE,
  listingHasActiveFilters,
  parseListingQuery,
  resetListingHref,
  toListQueryFilters,
  type ListingSearchParams,
} from "@/lib/catalog/listing-params";
import type { Category } from "@/lib/data";
import {
  brandRepository,
  categoryRepository,
  productRepository,
} from "@/lib/data";

function ancestorsOf(
  category: Category,
  bySlug: Map<string, Category>,
): Category[] {
  const chain: Category[] = [];
  let parentSlug = category.parentSlug;
  while (parentSlug) {
    const parent = bySlug.get(parentSlug);
    if (!parent) {
      break;
    }
    chain.unshift(parent);
    parentSlug = parent.parentSlug;
  }
  return chain;
}

export async function CategoryListing({
  category,
  searchParams,
}: {
  category: Category;
  searchParams: ListingSearchParams;
}) {
  const pathname = `/category/${category.slug}`;
  const attributeKeys =
    category.filterKeys.length > 0
      ? category.filterKeys
      : [...CATALOG_ATTRIBUTE_KEYS];
  const parsed = parseListingQuery(searchParams, attributeKeys);
  const content = getCategoryPageContent(category.slug, category.name);
  const listFilters = toListQueryFilters(parsed, { showBrandFilter: true });

  const [allCategories, brands, result, brandScope] = await Promise.all([
    categoryRepository.list(),
    brandRepository.list(),
    productRepository.list({
      categorySlug: category.slug,
      sort: parsed.sort,
      page: parsed.page,
      pageSize: LISTING_PAGE_SIZE,
      ...listFilters,
    }),
    productRepository.list({
      categorySlug: category.slug,
      sort: "featured",
      page: 1,
      pageSize: 1,
    }),
  ]);

  const bySlug = new Map(allCategories.map((item) => [item.slug, item]));
  const ancestors = ancestorsOf(category, bySlug);
  const children = allCategories.filter(
    (item) => item.parentSlug === category.slug,
  );
  const resetHref = resetListingHref(pathname);
  const filteredEmpty = listingHasActiveFilters(parsed);
  const brandNames = new Map(brands.map((brand) => [brand.slug, brand.name]));
  const brandFacet = brandScope.facets.find(
    (facet) => facet.key === BRAND_FACET_KEY,
  );
  const brandPills =
    brandFacet?.values.map((entry) => ({
      slug: entry.value,
      name: brandNames.get(entry.value) ?? entry.value,
      count: entry.count,
    })) ?? [];

  const headerTitle =
    content.priceHeaderTitle ?? `${content.listingTitle} Price in Bangladesh`;

  return (
    <div className="mx-auto max-w-catalog px-4 py-7 md:px-6 md:py-9">
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          ...ancestors.map((item) => ({
            href: `/category/${item.slug}`,
            label: item.name,
          })),
          { label: category.name },
        ]}
      />

      <CategoryBrandPills
        pathname={pathname}
        parsed={parsed}
        brands={brandPills}
      />

      {children.length > 0 ? (
        <nav className="mt-3" aria-label="Subcategories">
          <ul className="flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.slug}>
                <Link
                  href={`/category/${child.slug}`}
                  className="inline-flex h-9 items-center border border-dashed border-border bg-background px-3.5 text-[0.8125rem] font-medium text-text-muted transition-colors hover:border-primary hover:text-primary"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <CategoryListingBar
        title={headerTitle}
        total={result.total}
        pathname={pathname}
        parsed={parsed}
      />

      <CatalogListingBody
        pathname={pathname}
        preserved={{}}
        parsed={parsed}
        brands={brands}
        result={result}
        resetHref={resetHref}
        includeBrandFilter
        hideSort
        filterHeading="Filter By"
        emptyTitle={
          filteredEmpty
            ? "No matching products"
            : "No products in this category"
        }
        emptyDescription={
          filteredEmpty
            ? "Try clearing filters or choosing another subcategory."
            : "Matching products will appear here when the catalog has items for this category."
        }
      />

      <CategoryPageSeo content={content} />
    </div>
  );
}
