/**
 * What a product page shows a shopper before they click anything — the one
 * source for the Product JSON-LD offer (SEO phase 3) and the meta description
 * price (SEO phase 2), so neither can drift from the visible buy box.
 *
 * Mirrors the client components exactly:
 *   - selected variant: the `?variant=` one, else `defaultVariant()` (the
 *     cheapest in-stock variant) — `features/product/product-media-buy.tsx`
 *   - price / stock: the selected variant's, else the product's
 *   - price hidden: Up Coming, or out of stock and not Pre Order —
 *     `features/product/product-summary.tsx` (`priceHidden`)
 * Wholesale (B2B) prices are never involved: they only exist for a signed-in
 * verified account, never for a crawler.
 */
import { defaultVariant } from "@/lib/catalog/variants";
import type {
  Money,
  ProductDetail,
  ProductImage,
  ProductVariantChoice,
  StockStatus,
} from "@/lib/data";

export type DisplayedOffer = {
  variant: ProductVariantChoice | null;
  /** Heading the page shows (variant title only for a `?variant=` link). */
  name: string;
  sku: string;
  price: Money;
  compareAtPrice: Money | null;
  stockStatus: StockStatus;
  isPreOrder: boolean;
  isComingSoon: boolean;
  /** True when the page shows no price at all. */
  priceHidden: boolean;
  /** Gallery the page shows for the selection. */
  images: ProductImage[];
};

type OfferSource = Pick<
  ProductDetail,
  | "name"
  | "sku"
  | "price"
  | "compareAtPrice"
  | "stockStatus"
  | "isPreOrder"
  | "isComingSoon"
  | "variantChoices"
  | "image"
  | "images"
>;

export function displayedOffer(
  product: OfferSource,
  linkedVariant: ProductVariantChoice | null = null,
): DisplayedOffer {
  const variant =
    linkedVariant ??
    defaultVariant(
      product.variantChoices.map((choice) => ({
        ...choice,
        priceAmount: choice.price.amount,
        available: choice.stockStatus !== "out_of_stock",
      })),
    );
  const choice = variant
    ? (product.variantChoices.find((item) => item.id === variant.id) ?? null)
    : null;
  const stockStatus = choice?.stockStatus ?? product.stockStatus;
  return {
    variant: choice,
    name: linkedVariant?.title ?? product.name,
    sku: choice?.sku || product.sku,
    price: choice?.price ?? product.price,
    compareAtPrice: choice ? choice.compareAtPrice : product.compareAtPrice,
    stockStatus,
    isPreOrder: product.isPreOrder,
    isComingSoon: product.isComingSoon,
    priceHidden:
      product.isComingSoon ||
      (stockStatus === "out_of_stock" && !product.isPreOrder),
    images:
      choice && choice.images.length > 0
        ? choice.images
        : [product.image, ...product.images],
  };
}

/** A price worth publishing: a positive, finite whole-taka amount. */
export function isPublishablePrice(price: Money | null | undefined): boolean {
  return (
    price != null &&
    Number.isFinite(price.amount) &&
    price.amount > 0 &&
    Boolean(price.currency)
  );
}
