import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandListing } from "@/features/catalog/brand-listing";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { brandRepository } from "@/lib/data";
import { listingCanonicalUrl } from "@/lib/seo/canonical";
import { brandMeta } from "@/lib/seo/page-meta";
import {
  brandTopCategories,
  ogImagePath,
  socialMetadata,
} from "@/lib/seo/page-metadata";

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
  // B2 + keyword map: "{Brand} {main product type} Price in BD | Techno
  // House", the type taken from the brand's own categories. An
  // admin-written brand description, when there is one, wins.
  const meta = brandMeta(brand, await brandTopCategories(brand.slug));
  const description = brand.description?.trim() || meta.description;
  // ?page=N gets its own canonical; filter/sort combinations point at the
  // clean brand URL.
  const canonical = listingCanonicalUrl(
    `/brand/${brand.slug}`,
    await searchParams,
  );
  return {
    title: { absolute: meta.title },
    description,
    alternates: { canonical },
    ...socialMetadata({
      title: meta.title,
      description,
      canonical,
      image: { url: ogImagePath("brand", brand.slug), alt: meta.h1 },
    }),
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
