import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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
import { getPublicPromotionBySlug } from "@/lib/marketing/promotions";
import { listPromotionProductIds } from "@/lib/marketing/promotion-products";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingSearchParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const promotion = await getPublicPromotionBySlug(slug);
  return {
    title: promotion ? `${promotion.name} — Techno House` : "Offer not found",
  };
}

export default async function OfferDetailPage({
  params,
  searchParams,
}: Props) {
  const { slug } = await params;
  const promotion = await getPublicPromotionBySlug(slug);
  if (!promotion) {
    notFound();
  }

  const pathname = `/offers/${slug}`;

  // An offer can hold any mix of products across every category, so the
  // filter sidebar can't rely on one category's declared `filterKeys` (there
  // is no single category here) — same fallback `/shop` uses for the same
  // reason.
  const [productIds, brands, attributeKeys] = await Promise.all([
    listPromotionProductIds(promotion.id),
    brandRepository.list(),
    listStorefrontFilterKeys(),
  ]);

  const rawSearchParams = await searchParams;
  const parsed = parseListingQuery(rawSearchParams, attributeKeys);
  const result = await productRepository.list({
    productIds,
    sort: parsed.sort,
    page: parsed.page,
    pageSize: parsed.pageSize,
    ...toListQueryFilters(parsed, { showBrandFilter: true }),
  });

  const resetHref = resetListingHref(pathname);
  const filteredEmpty = listingHasActiveFilters(parsed);

  return (
    <div className="mx-auto max-w-catalog px-4 py-7 md:px-6 md:py-9">
      <p className="text-caption font-medium text-primary">
        <Link href="/offers" className="hover:underline">
          Offers
        </Link>
        <span className="text-text-muted"> / </span>
        {promotion.name}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {promotion.name}
      </h1>
      {promotion.summary ? (
        <p className="mt-2 max-w-prose text-body text-text-muted">
          {promotion.summary}
        </p>
      ) : null}

      <CatalogListingBody
        pathname={pathname}
        preserved={{}}
        parsed={parsed}
        brands={brands}
        result={result}
        resetHref={resetHref}
        includeBrandFilter
        filterHeading="Filter By"
        emptyTitle={filteredEmpty ? "No matching products" : "No products yet"}
        emptyDescription={
          filteredEmpty
            ? "Try clearing filters or broadening price and brand."
            : "Products will appear here once they're added to this offer."
        }
      />
    </div>
  );
}
