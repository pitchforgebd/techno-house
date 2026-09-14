import type { CategoryRepository } from "@/lib/data/repositories/category-repository";
import { toCategory } from "@/lib/data/prisma/mappers";
import { getPrisma } from "@/lib/db/prisma";

const CATEGORY_SELECT = {
  slug: true,
  name: true,
  filterKeys: true,
  parent: { select: { slug: true } },
} as const;

export const prismaCategoryRepository: CategoryRepository = {
  async list() {
    const rows = await getPrisma().category.findMany({
      where: { isActive: true },
      select: CATEGORY_SELECT,
      orderBy: [{ position: "asc" }, { slug: "asc" }],
    });
    return rows.map(toCategory);
  },

  async getBySlug(slug) {
    const row = await getPrisma().category.findFirst({
      where: { slug, isActive: true },
      select: CATEGORY_SELECT,
    });
    return row ? toCategory(row) : null;
  },
};
