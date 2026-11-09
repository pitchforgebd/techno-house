import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/features/catalog/category-listing";
import { getCategoryPageContent } from "@/lib/catalog/category-page-content";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { categoryRepository } from "@/lib/data";
import { listingCanonicalUrl } from "@/lib/seo/canonical";

// `generateStaticParams` below still pre-renders every known category at
// build time for a fast first hit; leaving `dynamicParams` at its default
// (true) means a category added or renamed after that build is rendered
// on-demand on its first visit and cached from then on, instead of 404ing
// until the next manual rebuild.
export const revalidate = 300;

export async function generateStaticParams() {
  const categories = await categoryRepository.list();
  return categories.map((category) => ({ slug: category.slug }));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingSearchParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await categoryRepository.getBySlug(slug);
  if (!category) {
    // Real 404 status — see product/[slug]/page.tsx.
    notFound();
  }
  const content = getCategoryPageContent(category.slug, category.name);
  return {
    title: `${content.listingTitle} — Techno House`,
    description: content.description,
    // ?page=N (and nothing else) gets its own canonical so page 2+ products
    // are discoverable; any filter/sort combination points at the clean URL
    // and is never indexed as a separate page.
    alternates: {
      canonical: listingCanonicalUrl(
        `/category/${category.slug}`,
        await searchParams,
      ),
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<ListingSearchParams>;
}) {
  const { slug } = await params;
  const category = await categoryRepository.getBySlug(slug);

  if (!category) {
    notFound();
  }

  const paramsQuery = await searchParams;
  return <CategoryListing category={category} searchParams={paramsQuery} />;
}
