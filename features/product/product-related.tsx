import { ProductCard } from "@/features/catalog/product-card";
import { ProductGrid } from "@/features/catalog/product-grid";
import { ProductSectionHeading } from "@/features/product/product-section-heading";
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
      <ProductSectionHeading id="product-related-heading">
        Related products
      </ProductSectionHeading>
      <p className="mt-3 text-caption text-text-muted">
        Pairs well with {productName}. Cross-sell suggestions from the catalog.
      </p>
      <div className="mt-5">
        {/* The shared grid is 5-wide on desktop, so one or two cross-sells
            read as a broken row of empty slots. Below three, lay them out as
            a short, deliberately sized row instead. */}
        {products.length <= 2 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
            {products.map((product) => (
              <li key={product.id} className="min-w-0">
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
        ) : (
          <ProductGrid products={products} density="comfortable" />
        )}
      </div>
    </section>
  );
}
