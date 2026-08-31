import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailTabs } from "@/features/product/product-detail-tabs";
import { ProductDetailsPanel } from "@/features/product/product-details-panel";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductQuestions } from "@/features/product/product-questions";
import { ProductRelated } from "@/features/product/product-related";
import { ProductReviews } from "@/features/product/product-reviews";
import { ProductSimilarSidebar } from "@/features/product/product-similar-sidebar";
import { ProductSpecifications } from "@/features/product/product-specifications";
import { ProductSummary } from "@/features/product/product-summary";
import { productRepository, reviewRepository } from "@/lib/data";
import { buildProductGalleryImages } from "@/lib/product/gallery-images";
import { averageProductRating } from "@/lib/product/rating";

export const dynamicParams = false;

export async function generateStaticParams() {
  const result = await productRepository.list({
    page: 1,
    pageSize: 48,
    sort: "featured",
  });
  return result.items.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await productRepository.getBySlug(slug);
  if (!product) {
    return { title: "Product — Techno House" };
  }
  return { title: `${product.name} — Techno House` };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await productRepository.getBySlug(slug);

  if (!product) {
    notFound();
  }

  const [reviews, questions, relatedProducts] = await Promise.all([
    reviewRepository.listReviewsByProductSlug(product.slug),
    reviewRepository.listQuestionsByProductSlug(product.slug),
    productRepository.listBySlugs(product.relatedSlugs),
  ]);

  const galleryImages = buildProductGalleryImages(
    product.images,
    product.image,
    product.name,
  );
  const averageRating = averageProductRating(reviews);

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ProductGallery images={galleryImages} productName={product.name} />
        <ProductSummary
          slug={product.slug}
          categorySlug={product.categorySlug}
          brandName={product.brandName}
          sku={product.sku}
          name={product.name}
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          stockStatus={product.stockStatus}
          isNew={product.isNew}
          isSale={product.isSale}
          warrantyLabel={product.warrantyLabel}
          overview={product.overview}
          specs={product.specs}
          averageRating={averageRating}
        />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,20rem)] xl:grid-cols-[minmax(0,1fr)_22rem]">
        <ProductDetailTabs
          specifications={
            <ProductSpecifications
              groups={product.specGroups}
              productName={product.name}
            />
          }
          details={
            <ProductDetailsPanel
              productName={product.name}
              brandName={product.brandName}
              warrantyLabel={product.warrantyLabel}
              overview={product.overview}
              specs={product.specs}
            />
          }
          reviews={
            <ProductReviews
              catalogReviews={reviews}
              productSlug={product.slug}
              productName={product.name}
            />
          }
          questions={
            <ProductQuestions
              catalogQuestions={questions}
              productSlug={product.slug}
              productName={product.name}
            />
          }
        />
        <ProductSimilarSidebar products={relatedProducts} />
      </div>

      <ProductRelated products={relatedProducts} productName={product.name} />
    </div>
  );
}
