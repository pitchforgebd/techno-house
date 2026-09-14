import type { CategoryRepository } from "@/lib/data/repositories/category-repository";
import { mockCategories } from "@/lib/data/mocks/catalog";

export const mockCategoryRepository: CategoryRepository = {
  async list() {
    return mockCategories;
  },

  async getBySlug(slug) {
    return mockCategories.find((category) => category.slug === slug) ?? null;
  },
};
