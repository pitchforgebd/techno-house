import type { Metadata } from "next";
import { SearchListing } from "@/features/catalog/search-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { parseSearchQuery } from "@/lib/search/query";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);
  if (!q) {
    return { title: "Search — Techno House" };
  }
  return { title: `Search “${q}” — Techno House` };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<ListingSearchParams>;
}) {
  const params = await searchParams;
  const q = parseSearchQuery(params.q);

  return <SearchListing q={q} searchParams={params} />;
}
