import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { ProductCard } from "@/features/catalog/product-card";
import { HomeSection } from "@/features/home/home-section";
import { productRepository } from "@/lib/data";

const FEATURED_PAGE_SIZE = 8;

export async function HomeFeatured() {
  const result = await productRepository.list({
    sort: "featured",
    page: 1,
    pageSize: FEATURED_PAGE_SIZE,
  });

  return (
    <HomeSection
      id="home-featured"
      title="Featured"
      lede="A short list from the current catalog. Prices in ৳ are display-only."
      heading="h2"
    >
      {result.items.length === 0 ? (
        <EmptyState
          title="No featured products"
          description="Featured product cards will appear here when the catalog is available."
        />
      ) : (
        <>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {result.items.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} />
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link
              href="/shop"
              className={buttonClassName({ variant: "ghost", size: "sm" })}
            >
              All products
            </Link>
          </p>
        </>
      )}
    </HomeSection>
  );
}
