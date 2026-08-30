import { ProductGrid } from "@/features/catalog/product-grid";
import type { ProductSummary } from "@/lib/data";

type ProductRelatedProps = {
  products: ProductSummary[];
  productName: string;
};

export function ProductRelated({ products, productName }: ProductRelatedProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="product-related-heading"
      className="mt-10 border-t border-border pt-10"
    >
      <h2
        id="product-related-heading"
        className="text-xl font-semibold tracking-tight text-text"
      >
        Related products
      </h2>
      <p className="mt-1 text-caption text-text-muted">
        Pairs well with {productName}. Cross-sell suggestions from the catalog,
        not personalized recommendations.
      </p>
      <div className="mt-6">
        <ProductGrid products={products} />
      </div>
    </section>
  );
}
