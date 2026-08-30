"use server";

import { productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";

function toListItem(
  product: Awaited<ReturnType<typeof productRepository.getBySlug>>,
): ProductSummary | null {
  if (!product) {
    return null;
  }
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brandSlug: product.brandSlug,
    brandName: product.brandName,
    categorySlug: product.categorySlug,
    sku: product.sku,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    stockStatus: product.stockStatus,
    warrantyLabel: product.warrantyLabel,
    image: product.image,
    specs: product.specs,
    isNew: product.isNew,
    isSale: product.isSale,
  };
}

export async function loadListProducts(
  slugs: string[],
): Promise<ProductSummary[]> {
  const unique = [...new Set(slugs.map((slug) => slug.trim()).filter(Boolean))];
  const products: ProductSummary[] = [];
  for (const slug of unique.slice(0, 48)) {
    const item = toListItem(await productRepository.getBySlug(slug));
    if (item) {
      products.push(item);
    }
  }
  return products;
}
