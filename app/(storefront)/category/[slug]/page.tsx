import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/features/catalog/category-listing";
import { getCategoryPageContent } from "@/lib/catalog/category-page-content";
import type { ListingSearchParams } from "@/lib/catalog/listing-params";
import { categoryRepository } from "@/lib/data";

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
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await categoryRepository.getBySlug(slug);
  if (!category) {
    return { title: "Category — Techno House" };
  }
  const content = getCategoryPageContent(category.slug, category.name);
  return {
    title: `${content.listingTitle} — Techno House`,
    description: content.description,
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
