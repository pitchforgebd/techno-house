import type { ProductQuestion, ProductReview } from "@/lib/data/types/reviews";

export interface ReviewRepository {
  listReviewsByProductSlug(slug: string): Promise<ProductReview[]>;
  listQuestionsByProductSlug(slug: string): Promise<ProductQuestion[]>;
}
