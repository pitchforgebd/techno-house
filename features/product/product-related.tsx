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
    <section aria-labelledby="product-related-heading" className="mt-10">
      <div className="flex items-stretch">
        <h2
          id="product-related-heading"
          className="flex shrink-0 items-center bg-text px-4 py-2 pr-7 text-label font-semibold tracking-tight text-primary-foreground [clip-path:polygon(0_0,calc(100%-0.85rem)_0,100%_100%,0_100%)]"
        >
          Related products
        </h2>
        <div className="min-w-0 flex-1 border-b-2 border-text" />
      </div>
      <p className="mt-3 text-caption text-text-muted">
        Pairs well with {productName}. Cross-sell suggestions from the catalog.
      </p>
      <div className="mt-5">
        <ProductGrid products={products} density="comfortable" />
      </div>
    </section>
  );
}
