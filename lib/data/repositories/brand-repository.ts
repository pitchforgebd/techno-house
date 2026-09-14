import type { Brand } from "@/lib/data/types/catalog";

export interface BrandRepository {
  list(): Promise<Brand[]>;
  getBySlug(slug: string): Promise<Brand | null>;
}
