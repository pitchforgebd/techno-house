import type { BrandRepository } from "@/lib/data/repositories/brand-repository";
import { mockBrands } from "@/lib/data/mocks/catalog";

export const mockBrandRepository: BrandRepository = {
  async list() {
    return mockBrands;
  },

  async getBySlug(slug) {
    return mockBrands.find((brand) => brand.slug === slug) ?? null;
  },
};
