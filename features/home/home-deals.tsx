import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { ProductCard } from "@/features/catalog/product-card";
import { HomeSection } from "@/features/home/home-section";
import { productRepository } from "@/lib/data";

const DEALS_PAGE_SIZE = 8;

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
      title="Deals"
      lede="Marked-down items from the catalog. Sale prices in ৳ are not a charge."
      heading="h2"
    >
      {result.items.length === 0 ? (
        <EmptyState
          title="No deals right now"
          description="Sale products will appear here when offers are listed."
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {result.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6">
        <Link
          href="/deals"
          className={buttonClassName({ variant: "secondary" })}
        >
          All deals
        </Link>
      </p>
    </HomeSection>
  );
}
