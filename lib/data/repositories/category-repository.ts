import type { Category } from "@/lib/data/types/catalog";

export interface CategoryRepository {
  list(): Promise<Category[]>;
  getBySlug(slug: string): Promise<Category | null>;
}
