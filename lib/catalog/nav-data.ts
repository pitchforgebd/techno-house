import { toCategoryTree } from "@/lib/catalog/category-tree";
import { collectBrandsByCategorySlug } from "@/lib/catalog/mega-menu";
import { categoryRepository, productRepository } from "@/lib/data";

export async function loadNavCatalog() {
  const [categories, categoryBrandPairs] = await Promise.all([
    categoryRepository.list(),
    productRepository.listCategoryBrandPairs(),
  ]);

  return {
    categories,
    tree: toCategoryTree(categories),
    brandsByCategory: collectBrandsByCategorySlug(categoryBrandPairs, categories),
  };
}
