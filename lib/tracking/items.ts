/**
 * Builders that turn storefront data into tracking items (AD-389). Pure and
 * server-safe, so a server component (product card, listing) can build the
 * item once and hand it to a client component as a plain prop.
 */
import type { CartLine } from "@/lib/cart/cart";
import { cartLineUnitAmount } from "@/lib/cart/cart";
import type { ProductSummary } from "@/lib/data";
import type { TrackItem } from "@/lib/tracking/events";

/**
 * One unit of a product as listed. `product.price` is already the effective
 * storefront price (`effectiveStorefrontPricing` ran in the mapper), i.e. the
 * sale price inside the discount window and the regular price outside it.
 */
export function trackItemFromSummary(
  product: ProductSummary,
  options: { index?: number; quantity?: number } = {},
): TrackItem {
  return {
    id: product.sku,
    name: product.name,
    brand: product.brandName || null,
    categories: product.categoryNames,
    price: product.price.amount,
    quantity: options.quantity ?? 1,
    index: options.index,
    slug: product.slug,
  };
}

/** A cart line, priced the way the cart prices it (variant price when set). */
export function trackItemFromCartLine(
  line: CartLine,
  product: ProductSummary,
): TrackItem {
  return {
    ...trackItemFromSummary(product, { quantity: line.quantity }),
    variant: line.variant?.name ?? null,
    price: cartLineUnitAmount(line, product.price.amount),
  };
}
