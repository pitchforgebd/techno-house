import type { Metadata } from "next";
import { ShopListing } from "@/features/catalog/shop-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { listingCanonicalUrl } from "@/lib/seo/canonical";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  return {
    title: "Shop — Techno House",
    // ?page=N gets its own canonical; filter/sort query strings are never
    // indexed separately from this base listing.
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
