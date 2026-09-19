import type {
  BuilderCandidate,
  BuilderSlot,
  ProductDetail,
  ProductListQuery,
  ProductListResult,
  ProductSearchSuggestion,
  ProductSummary,
} from "@/lib/data/types/catalog";

export interface ProductRepository {
  getBySlug(slug: string): Promise<ProductDetail | null>;
  list(query: ProductListQuery): Promise<ProductListResult>;
  listBySlugs(slugs: string[]): Promise<ProductSummary[]>;
  /** Candidates for one builder slot only — never the full catalog. */
  listByBuilderSlot(slot: BuilderSlot): Promise<BuilderCandidate[]>;
  /** Selected build parts with builder attrs — one query, caller order. */
  listBuilderCandidatesBySlugs(slugs: string[]): Promise<BuilderCandidate[]>;
  /** Header search-as-you-type dropdown — cheap, no facets/count/presets. */
  searchSuggestions(
    q: string,
    limit: number,
  ): Promise<{ items: ProductSearchSuggestion[]; total: number }>;
}
