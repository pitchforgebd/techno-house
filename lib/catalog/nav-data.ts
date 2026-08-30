import { toCategoryTree } from "@/lib/catalog/category-tree";
import { collectBrandsByCategorySlug } from "@/lib/catalog/mega-menu";
import { categoryRepository, productRepository } from "@/lib/data";

/** Max page size the mock listing API allows — enough for the current catalog. */
const NAV_PRODUCT_PAGE_SIZE = 48;

export async function loadNavCatalog() {
  const [categories, listing] = await Promise.all([
    categoryRepository.list(),
    productRepository.list({ page: 1, pageSize: NAV_PRODUCT_PAGE_SIZE }),
  ]);

  return {
    categories,
    tree: toCategoryTree(categories),
    brandsByCategory: collectBrandsByCategorySlug(listing.items, categories),
  };
}
