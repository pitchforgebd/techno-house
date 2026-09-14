"use server";

import { productRepository } from "@/lib/data";
import type { ProductSummary } from "@/lib/data";
import { MAX_CART_LINES } from "@/lib/cart/cart";

export async function loadCartProducts(
  slugs: string[],
): Promise<ProductSummary[]> {
  const unique = [
    ...new Set(slugs.map((slug) => slug.trim()).filter(Boolean)),
  ].slice(0, MAX_CART_LINES);
  return productRepository.listBySlugs(unique);
}
