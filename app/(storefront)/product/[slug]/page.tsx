import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/features/cart/add-to-cart-button";
import { ProductListActions } from "@/features/lists/product-list-actions";
import { ProductDetailTabs } from "@/features/product/product-detail-tabs";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductOverview } from "@/features/product/product-overview";
import { ProductPricing } from "@/features/product/product-pricing";
import { ProductQuestions } from "@/features/product/product-questions";
import { ProductRelated } from "@/features/product/product-related";
import { ProductReviews } from "@/features/product/product-reviews";
import { ProductSpecifications } from "@/features/product/product-specifications";
import { ProductWarranty } from "@/features/product/product-warranty";
import { productRepository, reviewRepository } from "@/lib/data";

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

  const galleryImages =
    product.images.length > 0 ? product.images : [product.image];

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
        <ProductGallery images={galleryImages} productName={product.name} />
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-2 text-body text-text-muted">
            {product.brandName} · SKU {product.sku}
          </p>
          <div className="mt-4">
            <ProductPricing
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              stockStatus={product.stockStatus}
              isNew={product.isNew}
              isSale={product.isSale}
            />
          </div>
          <div className="mt-4">
            <ProductWarranty warrantyLabel={product.warrantyLabel} />
          </div>
          <div className="mt-4 max-w-sm space-y-3">
            <AddToCartButton
              slug={product.slug}
              stockStatus={product.stockStatus}
            />
            <ProductListActions
              slug={product.slug}
              categorySlug={product.categorySlug}
            />
          </div>
          <div className="mt-6">
            <ProductOverview
              overview={product.overview}
              specs={product.specs}
            />
          </div>
        </div>
      </div>
      <ProductDetailTabs
        specifications={
          <ProductSpecifications
            groups={product.specGroups}
            productName={product.name}
          />
        }
        reviews={<ProductReviews reviews={reviews} />}
        questions={<ProductQuestions questions={questions} />}
      />
      <ProductRelated products={relatedProducts} productName={product.name} />
    </div>
  );
}
