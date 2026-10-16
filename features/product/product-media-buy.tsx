"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ProductGallery } from "@/features/product/product-gallery";
import { ProductServiceCards } from "@/features/product/product-service-cards";
import { ProductSummary } from "@/features/product/product-summary";
import type {
  Money,
  ProductColorOption,
  ProductImage,
  StockStatus,
} from "@/lib/data";
import { cn } from "@/lib/cn";
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
  modelNumber: string | null;
  isComingSoon: boolean;
  isPreOrder: boolean;
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
  b2bEligible?: boolean;
  viewerCount?: number | null;
  /** Rendered under the gallery (labels, warranty, notes); omit when empty. */
  belowGallery?: ReactNode;
  /** True when `belowGallery` includes product notes (the tall part of it). */
  hasNotes?: boolean;
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
  modelNumber,
  isComingSoon,
  isPreOrder,
  productImages,
  primaryImage,
  refundStickerSrc,
  emiConfig,
  isSignedIn,
  b2bAccount,
  b2bTerms,
  b2bEligible,
  viewerCount,
  belowGallery,
  hasNotes = false,
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

  const hasOptions = colors.length > 0;
  // Where the delivery cards go on large screens, chosen to keep the columns
  // level: colours -> under the colours (that column is otherwise short); notes
  // under the gallery -> in the buy column (the gallery column is already tall);
  // otherwise -> under the gallery (it is the short one).
  const serviceCardsAt: "options" | "info" | "gallery" = hasOptions
    ? "options"
    : hasNotes
      ? "info"
      : "gallery";
  // The campaign banner: with notes the gallery column is the tall one, so the
  // banner goes under the buy information; otherwise the columns are level and a
  // banner under either would unbalance them, so it spans both, as a strip
  // between the top and the details (where it always sat before).
  const bannerAt: "info" | "full" = hasNotes ? "info" : "full";
  const bannerFull = Boolean(banner) && bannerAt === "full";

  return (
    <>
      {/* The "first container" — gallery, buy box, colour options, and (when
          notes push the gallery column tall) the campaign banner under the
          buy box — all sit inside one card, matching the reference the
          operator shared. Specifications/details/reviews and the similar-
          products rail stay OUTSIDE it, below, as their own section — the
          request was explicitly scoped to this top container, not the whole
          page.
          Laid out like a classic storefront product page, on one flat
          12-column grid so the top lines up exactly:
            from xl (1280px):
              row 1  gallery (5) | buy information (4) | colour options (3, if any)
              row 2  gallery + notes continue          | banner (only with notes)
            lg (1024-1279px): two columns, gallery (5) | buy information (7,
              colours and delivery cards inside it)
          The options column exists only when the product has colours; otherwise
          the buy information takes its width. The gallery column holds the
          labels/warranty/notes and, when nothing else is there, the delivery
          cards under the image, so it stays about as tall as the buy
          information beside it. Below `lg` everything is one column in this
          same order (the colour options then sit inside the buy box, before
          the cart controls). */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-lg shadow-slate-900/5 sm:p-7 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-x-8">
          <div className="lg:col-span-5 lg:col-start-1 lg:row-span-2 lg:row-start-1">
            <ProductGallery
              key={selectedColorId ?? "default"}
              images={galleryImages}
              productName={
                selectedColor ? `${name} — ${selectedColor.name}` : name
              }
              refundStickerSrc={refundStickerSrc}
            />
            {belowGallery ? <div className="mt-5">{belowGallery}</div> : null}
            {/* From `lg` the delivery cards live here; below `lg` they stay in
                the buy box (ProductSummary), so they are never shown twice. */}
            {serviceCardsAt !== "info" ? (
              // "gallery": from lg. "options": only between lg and xl, because
              // from xl the cards sit in the options column instead.
              <div
                className={cn(
                  "mt-5 hidden lg:block",
                  serviceCardsAt === "options" && "xl:hidden",
                )}
              >
                <ProductServiceCards />
              </div>
            ) : null}
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
            reviewCount={reviewCount}
            colors={colors}
            selectedColorId={selectedColorId}
            onSelectedColorIdChange={setSelectedColorId}
            discountStartsAt={discountStartsAt}
            discountEndsAt={discountEndsAt}
            whatsappNumber={whatsappNumber}
            modelNumber={modelNumber}
            isComingSoon={isComingSoon}
            isPreOrder={isPreOrder}
            emiConfig={emiConfig}
            isSignedIn={isSignedIn}
            b2bAccount={b2bAccount}
            b2bTerms={b2bTerms}
            b2bEligible={b2bEligible}
            viewerCount={viewerCount}
            infoClassName={cn(
              "mt-8 min-w-0 lg:col-span-7 lg:col-start-6 lg:mt-0 lg:row-start-1",
              hasOptions && "xl:col-span-4",
            )}
            optionsClassName="min-w-0 xl:col-span-3 xl:col-start-10 xl:row-start-1"
            serviceCardsAt={serviceCardsAt}
          />

          {banner && bannerAt === "info" ? (
            <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-start-2 lg:self-start">
              {banner}
            </div>
          ) : null}
        </div>
      </div>

      {/* Full-width banner (no notes, so the card above stayed level) and the
          specifications/details/reviews block, now their own section below
          the card — a fresh 12-column grid that lines up with the card's
          columns without needing to share its row state. Grid auto-placement
          alone is enough to put `detail`/`similar` in the row under a full-
          width banner, since the banner occupies every column in row 1. */}
      {bannerFull || detail || similar ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          {bannerFull ? (
            <div className="mt-10 min-w-0 lg:col-span-12 lg:col-start-1">
              {banner}
            </div>
          ) : null}
          {detail ? (
            <div className="mt-10 min-w-0 lg:col-span-8 lg:col-start-1 xl:col-span-9">
              {detail}
            </div>
          ) : null}
          {similar ? (
            <div className="mt-6 min-w-0 lg:sticky lg:top-4 lg:col-span-4 lg:col-start-9 lg:mt-10 lg:self-start xl:col-span-3 xl:col-start-10">
              {similar}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
