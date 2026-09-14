import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandListing } from "@/features/catalog/brand-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { brandRepository } from "@/lib/data";

export const dynamicParams = false;

export async function generateStaticParams() {
  const brands = await brandRepository.list();
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await brandRepository.getBySlug(slug);
  if (!brand) {
    return { title: "Brand — Techno House" };
  }
  return {
    title: `${brand.name} — Techno House`,
    description: `Browse ${brand.name} products at Techno House.`,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingSearchParams>;
}) {
  const { slug } = await params;
  const brand = await brandRepository.getBySlug(slug);

  if (!brand) {
    notFound();
  }

  const paramsQuery = await searchParams;
  return <BrandListing brand={brand} searchParams={paramsQuery} />;
}
