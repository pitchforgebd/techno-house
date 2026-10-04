import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/features/catalog/product-card";
import { PRODUCT_CARD_GRID_CLASS } from "@/features/catalog/product-grid";
import { HomeSection } from "@/features/home/home-section";
import { loadHomeSectionProducts } from "@/features/home/load-home-section";
import { productRepository } from "@/lib/data";
import { HOME_SECTION_MAX } from "@/lib/marketing/home-section-input";

export async function HomeDeals() {
  // Staff-chosen products (Admin → Design Studio → Homepage products). The
  // Today's Deal switch still feeds the whole /deals page; here it only
  // supplies the automatic list while nothing is chosen.
  const items = await loadHomeSectionProducts("deals", async () => {
    const result = await productRepository.list({
      sort: "discount",
      onSaleOnly: true,
      page: 1,
      pageSize: HOME_SECTION_MAX,
    });
    return result.items;
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
      {items.length === 0 ? (
        <EmptyState
          title="No deals right now"
          description="Sale products will appear here when offers are listed."
        />
      ) : (
        <ul className={PRODUCT_CARD_GRID_CLASS}>
          {items.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </HomeSection>
  );
}
