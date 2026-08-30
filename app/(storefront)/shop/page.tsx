import type { Metadata } from "next";
import { ShopListing } from "@/features/catalog/shop-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";

export const metadata: Metadata = {
  title: "Shop — Techno House",
};

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  return <ShopListing searchParams={params} />;
}
