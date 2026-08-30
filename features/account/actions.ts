"use server";

import { productRepository } from "@/lib/data";

export type ProductPickerOption = {
  slug: string;
  name: string;
};

export async function loadProductPickerOptions(): Promise<
  ProductPickerOption[]
> {
  const result = await productRepository.list({
    page: 1,
    pageSize: 48,
    sort: "featured",
  });
  return result.items.map((product) => ({
    slug: product.slug,
    name: product.name,
  }));
}
