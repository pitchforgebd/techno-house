"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductSummary } from "@/features/product/product-summary";
import type {
  Money,
  ProductColorOption,
  ProductImage,
  StockStatus,
} from "@/lib/data";
import { buildProductGalleryImages } from "@/lib/product/gallery-images";
import type { AdminEmiConfig } from "@/lib/payments/emi-shared";
import type { B2BStatus } from "@/lib/generated/prisma/enums";

type ProductMediaBuyProps = {
  slug: string;
  categorySlug: string;
  brandName: string;
  sku: string;
  name: string;
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
  isNew: boolean;
  isSale: boolean;
  warrantyLabel: string;
  overviewHtml: string | null;
  averageRating: number;
  reviewCount: number;
  colors: ProductColorOption[];
  discountStartsAt: string | null;
  discountEndsAt: string | null;
  whatsappNumber?: string | null;
  productImages: ProductImage[];
  primaryImage: ProductImage;
  refundStickerSrc?: string | null;
  emiConfig?: AdminEmiConfig;
  isSignedIn?: boolean;
  b2bAccount?: {
    status: B2BStatus;
    company: string;
    discountPercent: number;
  } | null;
  b2bTerms?: import("@/lib/b2b/pricing").B2BProductTerms | null;
  viewerCount?: number | null;
  /** Rendered under the gallery (labels, warranty, notes); omit when empty. */
  belowGallery?: ReactNode;
  /** Campaign strip under the buy box; omit when there is none. */
  banner?: ReactNode;
  /** Specifications / details / Q&A / reviews — flows under the gallery. */
  detail?: ReactNode;
  /** Similar-products rail — sticks beside the long detail column. */
  similar?: ReactNode;
};

export function ProductMediaBuy({
  slug,
  categorySlug,
  brandName,
  sku,
  name,
  price,
  compareAtPrice,
  stockStatus,
  isNew,
  isSale,
  warrantyLabel,
  overviewHtml,
  averageRating,
  reviewCount,
  colors,
  discountStartsAt,
  discountEndsAt,
  whatsappNumber,
  productImages,
  primaryImage,
  refundStickerSrc,
  emiConfig,
  isSignedIn,
  b2bAccount,
  b2bTerms,
  viewerCount,
  belowGallery,
  banner,
  detail,
  similar,
}: ProductMediaBuyProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(
    colors.length === 1 ? (colors[0]?.id ?? null) : colors[0]?.id ?? null,
  );

  const selectedColor =
    colors.find((color) => color.id === selectedColorId) ?? null;

  const galleryImages = useMemo(() => {
    if (selectedColor && selectedColor.images.length > 0) {
      return buildProductGalleryImages(
        selectedColor.images,
        selectedColor.images[0] ?? primaryImage,
        `${name} — ${selectedColor.name}`,
      );
    }
    return buildProductGalleryImages(productImages, primaryImage, name);
  }, [selectedColor, productImages, primaryImage, name]);

  return (
    // Two independent columns on large screens: media (gallery, then notes,
    // then the details) on the left and the buy box (then banner, then similar
    // products) on the right. The right column spans every row and the last row
    // is flexible, so whatever the buy box needs beyond the gallery is added at
    // the BOTTOM of the left column, never as a gap under the image — with no
    // notes the details rise to sit right under the gallery, and notes added
    // later slot in between. Below `lg` the wrapper around the right column
    // dissolves (`contents`) and `order` restores the single-column reading
    // order: gallery, notes, buy box, banner, details, similar products.
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-x-8">
      <div className="order-1 lg:col-start-1 lg:row-start-1">
        <ProductGallery
          key={selectedColorId ?? "default"}
          images={galleryImages}
          productName={
            selectedColor ? `${name} — ${selectedColor.name}` : name
          }
          refundStickerSrc={refundStickerSrc}
        />
      </div>
      {belowGallery ? (
        <div className="order-2 mt-5 lg:col-start-1 lg:row-start-2">
          {belowGallery}
        </div>
      ) : null}

      <div className="contents lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:block">
        <div className="order-3 mt-8 lg:mt-0">
          <ProductSummary
            slug={slug}
            categorySlug={categorySlug}
            brandName={brandName}
            sku={sku}
            name={name}
            price={price}
            compareAtPrice={compareAtPrice}
            stockStatus={stockStatus}
            isNew={isNew}
            isSale={isSale}
            warrantyLabel={warrantyLabel}
            overviewHtml={overviewHtml}
            averageRating={averageRating}
            reviewCount={reviewCount}
            colors={colors}
            selectedColorId={selectedColorId}
            onSelectedColorIdChange={setSelectedColorId}
            discountStartsAt={discountStartsAt}
            discountEndsAt={discountEndsAt}
            whatsappNumber={whatsappNumber}
            emiConfig={emiConfig}
            isSignedIn={isSignedIn}
            b2bAccount={b2bAccount}
            b2bTerms={b2bTerms}
            viewerCount={viewerCount}
          />
        </div>
        {banner ? <div className="order-4">{banner}</div> : null}
        {similar ? (
          <div className="order-6 mt-6 lg:sticky lg:top-4">{similar}</div>
        ) : null}
      </div>

      {detail ? (
        <div className="order-5 mt-10 min-w-0 lg:col-start-1 lg:row-start-3">
          {detail}
        </div>
      ) : null}
    </div>
  );
}
