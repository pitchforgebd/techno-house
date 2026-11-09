import type { Metadata } from "next";
import { ShopListing } from "@/features/catalog/shop-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { listingCanonicalUrl } from "@/lib/seo/canonical";
import { staticPageMetadata } from "@/lib/seo/page-metadata";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  // Title/description from STATIC_PAGE_META (B6). ?page=N gets its own
  // canonical; filter/sort query strings are never indexed separately from
  // this base listing.
  return {
    ...staticPageMetadata("/shop"),
    alternates: {
      canonical: listingCanonicalUrl("/shop", await searchParams),
    },
  };
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  return <ShopListing searchParams={params} />;
}
