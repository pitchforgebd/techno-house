import { toCategoryTree } from "@/lib/catalog/category-tree";
import { collectBrandsByCategorySlug } from "@/lib/catalog/mega-menu";
import { brandRepository, categoryRepository, productRepository } from "@/lib/data";

export async function loadNavCatalog() {
  const [categories, categoryBrandPairs, brands] = await Promise.all([
    categoryRepository.list(),
    productRepository.listCategoryBrandPairs(),
    brandRepository.list(),
  ]);

  return {
    categories,
    tree: toCategoryTree(categories),
    brandsByCategory: collectBrandsByCategorySlug(
      categoryBrandPairs,
      categories,
      brands,
    ),
  };
}
