import type { BrandRepository } from "@/lib/data/repositories/brand-repository";
import { toBrand } from "@/lib/data/prisma/mappers";
import { getPrisma } from "@/lib/db/prisma";

const BRAND_SELECT = {
  slug: true,
  name: true,
  logoSrc: true,
} as const;

export const prismaBrandRepository: BrandRepository = {
  async list() {
    const rows = await getPrisma().brand.findMany({
      where: { isActive: true },
      select: BRAND_SELECT,
      orderBy: [{ position: "asc" }, { slug: "asc" }],
    });
    return rows.map(toBrand);
  },

  async getBySlug(slug) {
    const row = await getPrisma().brand.findFirst({
      where: { slug, isActive: true },
      select: BRAND_SELECT,
    });
    return row ? toBrand(row) : null;
  },
};
