import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld-script";
import { ProductDetailSections } from "@/features/product/product-detail-sections";
import { ProductDetailsPanel } from "@/features/product/product-details-panel";
import { ProductMediaBuy } from "@/features/product/product-media-buy";
import { ProductMediaExtras } from "@/features/product/product-media-extras";
import { ProductPageBanner } from "@/features/product/product-page-banner";
import {
  ProductLabelsRow,
  ProductNotesPanel,
} from "@/features/product/product-notes-labels";
import { ProductQuestions } from "@/features/product/product-questions";
import { ProductRelated } from "@/features/product/product-related";
import { ProductReviews } from "@/features/product/product-reviews";
import { ProductSimilarSidebar } from "@/features/product/product-similar-sidebar";
import { ProductSpecifications } from "@/features/product/product-specifications";
import { ProductWarranty } from "@/features/product/product-warranty";
import { categoryAncestors } from "@/lib/catalog/category-tree";
import { categoryRepository, productRepository, reviewRepository } from "@/lib/data";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";
import { canonicalUrl } from "@/lib/seo/canonical";
import { breadcrumbListJsonLd, productJsonLd } from "@/lib/seo/json-ld";
import { getStorefrontHomeBanners } from "@/lib/design/home-banners";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { getB2BTermsForProductId } from "@/lib/b2b/product-terms";
import { getMyB2BAccount } from "@/lib/b2b/applications";
import { getLiveViewerCount } from "@/lib/analytics/product-views";
import { getVisitorWidgetSettings } from "@/lib/marketing/visitor-widget-settings";
import { getStorefrontChatWidgetTag } from "@/lib/chat/config";
import { ProductViewTracker } from "@/features/storefront/product-view-tracker";
import {
  listOwnPendingQuestionsForProduct,
  listOwnPendingReviewsForProduct,
} from "@/lib/catalog/customer-reviews";
import { averageProductRating } from "@/lib/product/rating";
import { getRefundPolicySettings } from "@/lib/refunds/settings";
import { getEmiConfig } from "@/lib/payments/emi-config";
import { isFeatureFlagEnabled } from "@/lib/admin/feature-flags-config";

// See the matching comment in category/[slug]/page.tsx — same reasoning.
// (This page also reads the customer session, which already opts individual
// requests into dynamic rendering when signed in; this setting only governs
// which slugs are servable at all.)
export const revalidate = 300;

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
  const description =
    product.overview[0]?.trim() ||
    `${product.name} by ${product.brandName}. ${product.warrantyLabel}.`;
  const title = `${product.name} — Techno House`;
  return {
    title,
    description,
    alternates: { canonical: canonicalUrl(`/product/${product.slug}`) },
    openGraph: {
      title: product.name,
      description,
      // Next's typed OpenGraphType union has no "product" variant (only
      // website/article/book/profile/video/music) — "website" is the
      // accurate choice within what it actually supports. The Product
      // JSON-LD below is the real machine-readable signal for crawlers.
      type: "website",
      images: product.image.src
        ? [{ url: product.image.src, alt: product.image.alt }]
        : undefined,
    },
  };
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

  const session = await getCustomerSession();
  const [
    reviews,
    questions,
    relatedProducts,
    categoryProducts,
    ownReviews,
    ownQuestions,
    refundSettings,
    emiConfig,
    b2bAccount,
    questionsEnabled,
    chatWidgetTag,
    allCategories,
  ] = await Promise.all([
    reviewRepository.listReviewsByProductSlug(product.slug),
    reviewRepository.listQuestionsByProductSlug(product.slug),
    productRepository.listBySlugs(product.relatedSlugs),
    // Sidebar showed the same admin-picked cross-sells as the "Related
    // products" row below it — the identical card twice on one page. Same
    // category instead, minus this product and anything already in that row.
    productRepository.list({
      categorySlug: product.categorySlug,
      page: 1,
      pageSize: 8,
      sort: "featured",
    }),
    session
      ? listOwnPendingReviewsForProduct(session.userId, product.slug)
      : Promise.resolve([]),
    session
      ? listOwnPendingQuestionsForProduct(session.userId, product.slug)
      : Promise.resolve([]),
    getRefundPolicySettings(),
    getEmiConfig(),
    session ? getMyB2BAccount(session.userId) : Promise.resolve(null),
    isFeatureFlagEnabled("product-query"),
    getStorefrontChatWidgetTag(),
    // For the breadcrumb trail — same ancestor-walk category/brand pages use.
    categoryRepository.list(),
  ]);

  const averageRating = averageProductRating(reviews);

  // Wholesale terms are only fetched for a verified account, so an unverified
  // (or retail) shopper can never be handed a B2B price by accident.
  const b2bTerms =
    b2bAccount?.status === "ACTIVE"
      ? await getB2BTermsForProductId(product.id)
      : null;

  // Prefer category items that aren't already in the "Related products" row,
  // but a small category can leave nothing — then repeating one card beats an
  // empty rail.
  const relatedSlugSet = new Set(relatedProducts.map((item) => item.slug));
  const sameCategory = categoryProducts.items.filter(
    (item) => item.slug !== product.slug,
  );
  const notAlreadyShown = sameCategory.filter(
    (item) => !relatedSlugSet.has(item.slug),
  );
  const similarProducts = (
    notAlreadyShown.length > 0 ? notAlreadyShown : sameCategory
  ).slice(0, 4);

  // Sanitized again here, not just on save — stored HTML is never trusted
  // just because it was clean when the admin form submitted it (AD-264
  // precedent). `null` propagates through so each panel can distinguish
  // "add real content" from "nothing written yet."
  const overviewHtml = product.overviewHtml
    ? sanitizeBlogBody(product.overviewHtml)
    : null;
  const detailsHtml = product.detailsHtml
    ? sanitizeBlogBody(product.detailsHtml)
    : null;

  // Campaign strip under the buy box — same admin-managed banner system as
  // the homepage slots; absent until the operator adds one.
  const productPageBanner =
    (await getStorefrontHomeBanners("product-page"))[0] ?? null;

  // The strip under the gallery exists only when there is something to put in
  // it, so a product with no labels, warranty or notes leaves no empty block
  // (and the details rise to sit right under the image).
  const hasBelowGallery =
    product.labels.length > 0 ||
    Boolean(product.warrantyLabel) ||
    product.notes.length > 0;

  const visitorWidgetSettings = await getVisitorWidgetSettings();
  const liveViewerCount = visitorWidgetSettings.enabled
    ? await getLiveViewerCount(product.slug, visitorWidgetSettings.windowMinutes)
    : 0;
  const viewerCount =
    visitorWidgetSettings.enabled && liveViewerCount >= visitorWidgetSettings.minToShow
      ? liveViewerCount
      : null;

  // Same ancestor-walk category/brand listing pages use, so the trail
  // reflects the real nesting depth instead of a fixed number of levels.
  const productCategory = allCategories.find(
    (item) => item.slug === product.categorySlug,
  );
  const categoryAncestry = productCategory
    ? categoryAncestors(productCategory, allCategories)
    : [];
  const breadcrumbItems = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    ...categoryAncestry.map((item) => ({
      href: `/category/${item.slug}`,
      label: item.name,
    })),
    ...(productCategory
      ? [{ href: `/category/${productCategory.slug}`, label: productCategory.name }]
      : []),
    { label: product.name },
  ];

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <JsonLd data={breadcrumbListJsonLd(breadcrumbItems)} />
      <JsonLd
        data={productJsonLd({
          product,
          path: `/product/${product.slug}`,
          reviewCount: reviews.length,
          averageRating,
        })}
      />
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbItems} />
      </div>
      <ProductViewTracker slug={product.slug} />
      <ProductMediaBuy
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
        overviewHtml={overviewHtml}
        averageRating={averageRating}
        reviewCount={reviews.length}
        colors={product.colors}
        discountStartsAt={product.discountStartsAt}
        discountEndsAt={product.discountEndsAt}
        whatsappNumber={chatWidgetTag.whatsappNumber}
        productImages={product.images}
        primaryImage={product.image}
        refundStickerSrc={refundSettings.stickerSrc}
        emiConfig={emiConfig}
        isSignedIn={Boolean(session)}
        b2bAccount={
          b2bAccount
            ? {
                status: b2bAccount.status,
                company: b2bAccount.company,
                discountPercent: b2bAccount.discountPercent,
              }
            : null
        }
        b2bTerms={b2bTerms}
        viewerCount={viewerCount}
        belowGallery={
          hasBelowGallery ? (
            <div className="space-y-4">
              {product.labels.length > 0 ? (
                <ProductLabelsRow labels={product.labels} />
              ) : null}
              {product.warrantyLabel ? (
                <ProductWarranty
                  warrantyLabel={product.warrantyLabel}
                  warrantyBadge={product.warrantyBadge}
                  warrantyLogoSrc={product.warrantyLogoSrc}
                />
              ) : null}
              <ProductNotesPanel notes={product.notes} />
            </div>
          ) : null
        }
        banner={
          productPageBanner ? (
            <ProductPageBanner banner={productPageBanner} />
          ) : null
        }
        detail={
          <>
            <ProductDetailSections
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
                  warrantyBadge={product.warrantyBadge}
                  warrantyLogoSrc={product.warrantyLogoSrc}
                  detailsHtml={detailsHtml}
                />
              }
              reviews={
                <ProductReviews
                  catalogReviews={reviews}
                  ownReviews={ownReviews}
                  productSlug={product.slug}
                />
              }
              showQuestions={questionsEnabled}
              questions={
                questionsEnabled ? (
                  <ProductQuestions
                    catalogQuestions={questions}
                    ownQuestions={ownQuestions}
                    productSlug={product.slug}
                  />
                ) : null
              }
            />
            <ProductMediaExtras
              productName={product.name}
              youtubeUrl={product.youtubeUrl}
              pdfSpecificationSrc={product.pdfSpecificationSrc}
            />
          </>
        }
        similar={<ProductSimilarSidebar products={similarProducts} />}
      />

      <ProductRelated products={relatedProducts} productName={product.name} />
    </div>
  );
}
