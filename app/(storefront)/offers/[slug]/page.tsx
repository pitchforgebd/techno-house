import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/features/catalog/product-card";
import { PRODUCT_CARD_GRID_CLASS } from "@/features/catalog/product-grid";
import { productRepository } from "@/lib/data";
import { getPublicPromotionBySlug } from "@/lib/marketing/promotions";
import { listPromotionProductSlugs } from "@/lib/marketing/promotion-products";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const promotion = await getPublicPromotionBySlug(slug);
  return {
    title: promotion ? `${promotion.name} — Techno House` : "Offer not found",
  };
}

export default async function OfferDetailPage({ params }: Props) {
  const { slug } = await params;
  const promotion = await getPublicPromotionBySlug(slug);
  if (!promotion) {
    notFound();
  }

  const productSlugs = await listPromotionProductSlugs(promotion.id);
  const products = await productRepository.listBySlugs(productSlugs);

  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <p className="text-caption font-medium text-primary">
        <Link href="/offers" className="hover:underline">
          Offers
        </Link>
        <span className="text-text-muted"> / </span>
        {promotion.name}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl">
        {promotion.name}
      </h1>
      {promotion.summary ? (
        <p className="mt-2 max-w-prose text-body text-text-muted">
          {promotion.summary}
        </p>
      ) : null}

      {products.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No products yet"
          description="Products will appear here once they're added to this offer."
        />
      ) : (
        <ul className={`mt-6 ${PRODUCT_CARD_GRID_CLASS}`}>
          {products.map((product) => (
            <li key={product.id} className="min-w-0">
              <ProductCard product={product} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
