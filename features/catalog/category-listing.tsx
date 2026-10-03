import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld-script";
import { CatalogListingBody } from "@/features/catalog/catalog-listing-body";
import { CategoryBrandPills } from "@/features/catalog/category-brand-pills";
import { CategoryListingBar } from "@/features/catalog/category-listing-bar";
import { CategoryPageSeo } from "@/features/catalog/category-page-seo";
import { categoryAncestors } from "@/lib/catalog/category-tree";
import { getCategoryPageContent } from "@/lib/catalog/category-page-content";
import { getCategorySeoHtml } from "@/lib/catalog/category-seo-content";
import { listStorefrontFilterKeys } from "@/lib/catalog/filter-keys";
import {
  BRAND_FACET_KEY,
  listingHasActiveFilters,
  parseListingQuery,
  resetListingHref,
  toListQueryFilters,
  type ListingSearchParams,
} from "@/lib/catalog/listing-params";
import {
  brandRepository,
  categoryRepository,
  productRepository,
  type Category,
} from "@/lib/data";
import { breadcrumbListJsonLd } from "@/lib/seo/json-ld";

export async function CategoryListing({
  category,
  searchParams,
}: {
  category: Category;
  searchParams: ListingSearchParams;
}) {
  const pathname = `/category/${category.slug}`;
  const fallbackKeys = await listStorefrontFilterKeys();
  const attributeKeys =
    category.filterKeys.length > 0 ? category.filterKeys : fallbackKeys;
  const parsed = parseListingQuery(searchParams, attributeKeys);
  const content = getCategoryPageContent(category.slug, category.name);
  const seoHtml = await getCategorySeoHtml(category.slug);
  const listFilters = toListQueryFilters(parsed, { showBrandFilter: true });

  const [allCategories, brands, result, brandScope] = await Promise.all([
    categoryRepository.list(),
    brandRepository.list(),
    productRepository.list({
      categorySlug: category.slug,
      sort: parsed.sort,
      page: parsed.page,
      pageSize: parsed.pageSize,
      ...listFilters,
    }),
    productRepository.list({
      categorySlug: category.slug,
      sort: "featured",
      page: 1,
      pageSize: 1,
    }),
  ]);

  const ancestors = categoryAncestors(category, allCategories);
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
  // Admin-curated brands for this category (Category.extraBrandSlugs) show
  // up even with zero matching products yet — lets the page look "ready"
  // before the client finishes stocking it. Real product-derived brands
  // above take precedence; this only adds slugs not already listed.
  const brandPillSlugs = new Set(brandPills.map((pill) => pill.slug));
  for (const slug of category.extraBrandSlugs) {
    if (!brandPillSlugs.has(slug) && brandNames.has(slug)) {
      brandPills.push({ slug, name: brandNames.get(slug)!, count: 0 });
      brandPillSlugs.add(slug);
    }
  }
  brandPills.sort((left, right) => left.name.localeCompare(right.name));

  const headerTitle =
    content.priceHeaderTitle ?? `${content.listingTitle} Price in Bangladesh`;

  const breadcrumbItems = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    ...ancestors.map((item) => ({
      href: `/category/${item.slug}`,
      label: item.name,
    })),
    { label: category.name },
  ];

  return (
    <div className="mx-auto max-w-catalog px-4 py-7 md:px-6 md:py-9">
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems)} />
      <Breadcrumbs items={breadcrumbItems} />

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

      <CategoryPageSeo content={content} html={seoHtml} />
    </div>
  );
}
