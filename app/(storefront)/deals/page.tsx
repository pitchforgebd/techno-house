import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/features/catalog/product-card";
import { PRODUCT_CARD_GRID_CLASS } from "@/features/catalog/product-grid";
import { productRepository } from "@/lib/data";

export const metadata: Metadata = {
  title: "Deals — Techno House",
};

export default async function DealsPage() {
  const result = await productRepository.list({
    sort: "discount",
    onSaleOnly: true,
    page: 1,
    pageSize: 40,
  });

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Deals</h1>
      <p className="mt-2 text-body text-text-muted">
        Products flagged for today&apos;s deal. Sale prices on cards are
        display-only until checkout recalculates them.
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          className="mt-6"
          title="Current deals"
          description="Sale products will appear here when a deal is listed."
        />
      ) : (
        <ul className={`mt-6 ${PRODUCT_CARD_GRID_CLASS}`}>
          {result.items.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
