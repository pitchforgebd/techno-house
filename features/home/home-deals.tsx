import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/features/catalog/product-card";
import { PRODUCT_CARD_GRID_CLASS } from "@/features/catalog/product-grid";
import { HomeSection } from "@/features/home/home-section";
import { productRepository } from "@/lib/data";

const DEALS_PAGE_SIZE = 10;

export async function HomeDeals() {
  const result = await productRepository.list({
    sort: "discount",
    onSaleOnly: true,
    page: 1,
    pageSize: DEALS_PAGE_SIZE,
  });

  return (
    <HomeSection
      id="home-deals"
      title="Best deals"
      heading="h2"
      action={
        <Link
          href="/deals"
          className="text-caption font-semibold tracking-wide text-primary uppercase hover:text-primary-hover"
        >
          See all
        </Link>
      }
    >
      {result.items.length === 0 ? (
        <EmptyState
          title="No deals right now"
          description="Sale products will appear here when offers are listed."
        />
      ) : (
        <ul className={PRODUCT_CARD_GRID_CLASS}>
          {result.items.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </HomeSection>
  );
}
