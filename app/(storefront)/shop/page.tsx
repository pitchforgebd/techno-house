import type { Metadata } from "next";
import { ShopListing } from "@/features/catalog/shop-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { canonicalUrl } from "@/lib/seo/canonical";

export const metadata: Metadata = {
  title: "Shop — Techno House",
  // Clean URL only — filter/sort/page query strings are never indexed
  // separately from this base listing.
  alternates: { canonical: canonicalUrl("/shop") },
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  return <ShopListing searchParams={params} />;
}
