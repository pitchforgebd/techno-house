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
  /** Rendered under the gallery, inside the media column. */
  belowGallery?: ReactNode;
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
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      {/* Gallery column carries `belowGallery` (warranty / labels / notes) so
          the shorter media side fills instead of leaving a tall gap under the
          image while the buy column runs on. */}
      <div className="space-y-5">
        <ProductGallery
          key={selectedColorId ?? "default"}
          images={galleryImages}
          productName={
            selectedColor ? `${name} — ${selectedColor.name}` : name
          }
          refundStickerSrc={refundStickerSrc}
        />
        {belowGallery}
      </div>
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
  );
}
