import {
  CatalogProductCard,
  ProductCard,
} from "@/features/catalog/product-card";
import type { ProductSummary } from "@/lib/data";
import { cn } from "@/lib/cn";

/** 2 / 3 / 4 / 5 columns. No horizontal scroll. */
export const PRODUCT_CARD_GRID_CLASS =
  "grid grid-cols-2 gap-3 min-[400px]:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

/** Cards in the first row of the widest layout (`xl:grid-cols-5` above). */
const FIRST_ROW_CARDS = 5;

/**
 * Cards in the first row of the narrowest layout (`grid-cols-2`), the only
 * ones a phone shows without scrolling. These get `fetchpriority="high"`.
 */
const FIRST_ROW_CARDS_MOBILE = 2;

export function ProductGrid({
  products,
  density = "default",
  card = "compact",
  eagerFirstRow = false,
}: {
  products: ProductSummary[];
  /** `comfortable` uses a slightly looser gap on wide screens. */
  density?: "default" | "comfortable";
  /**
   * `detailed` adds the SKU and the spec bullets — the information someone
   * comparing twenty monitors actually needs, and the reason a listing card
   * differs from the compact card used in carousels and related products,
   * where there is no comparison to make and the extra lines are noise.
   */
  card?: "compact" | "detailed";
  /**
   * Listing pages only: the first row is what the visitor sees before
   * scrolling, and on a category page its first image is the Largest
   * Contentful Paint element. Left lazy, the browser discovers it late and
   * fetches it at low priority (a 420–470 ms load delay in production), so
   * the first row loads eagerly and the phone-visible cards also ask for
   * `fetchpriority="high"`. Everything below stays lazy.
   */
  eagerFirstRow?: boolean;
}) {
  const Card = card === "detailed" ? CatalogProductCard : ProductCard;
  return (
    <ul
      className={cn(
        PRODUCT_CARD_GRID_CLASS,
        density === "comfortable" ? "lg:gap-5" : null,
      )}
    >
      {products.map((product, index) => (
        <li key={product.id} className="min-w-0">
          {eagerFirstRow && index < FIRST_ROW_CARDS ? (
            <Card
              product={product}
              imageLoading={index < FIRST_ROW_CARDS_MOBILE ? "high" : "eager"}
            />
          ) : (
            <Card product={product} />
          )}
        </li>
      ))}
    </ul>
  );
}
