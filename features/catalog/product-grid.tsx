import {
  CatalogProductCard,
  ProductCard,
} from "@/features/catalog/product-card";
import type { ProductSummary } from "@/lib/data";
import { cn } from "@/lib/cn";

/** 2 / 3 / 4 / 5 columns. No horizontal scroll. */
export const PRODUCT_CARD_GRID_CLASS =
  "grid grid-cols-2 gap-3 min-[400px]:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export function ProductGrid({
  products,
  density = "default",
  card = "compact",
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
}) {
  const Card = card === "detailed" ? CatalogProductCard : ProductCard;
  return (
    <ul
      className={cn(
        PRODUCT_CARD_GRID_CLASS,
        density === "comfortable" ? "lg:gap-5" : null,
      )}
    >
      {products.map((product) => (
        <li key={product.id} className="min-w-0">
          <Card product={product} />
        </li>
      ))}
    </ul>
  );
}
