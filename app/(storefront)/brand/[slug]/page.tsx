import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandListing } from "@/features/catalog/brand-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { brandRepository } from "@/lib/data";
import { listingCanonicalUrl } from "@/lib/seo/canonical";

// See the matching comment in category/[slug]/page.tsx — same reasoning.
export const revalidate = 300;

export async function generateStaticParams() {
  const brands = await brandRepository.list();
  return brands.map((brand) => ({ slug: brand.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const brand = await brandRepository.getBySlug(slug);
  if (!brand) {
    // Real 404 status — see product/[slug]/page.tsx.
    notFound();
  }
  return {
    title: `${brand.name} — Techno House`,
    description:
      brand.description || `Browse ${brand.name} products at Techno House.`,
    // ?page=N gets its own canonical; filter/sort combinations point at the
    // clean brand URL.
    alternates: {
      canonical: listingCanonicalUrl(`/brand/${brand.slug}`, await searchParams),
    },
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
