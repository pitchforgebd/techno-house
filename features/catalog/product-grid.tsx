import { CatalogProductCard } from "@/features/catalog/product-card";
import type { ProductSummary } from "@/lib/data";
import { cn } from "@/lib/cn";

export function ProductGrid({
  products,
  density = "default",
}: {
  products: ProductSummary[];
  /** `comfortable` uses fewer columns for larger cards on wide screens. */
  density?: "default" | "comfortable";
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:gap-4",
        density === "comfortable"
          ? "lg:grid-cols-3 xl:grid-cols-4"
          : "lg:grid-cols-4 xl:grid-cols-5",
      )}
    >
      {products.map((product) => (
        <li key={product.id}>
          <CatalogProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}
