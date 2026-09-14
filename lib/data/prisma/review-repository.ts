import type { ReviewRepository } from "@/lib/data/repositories/review-repository";
import { toProductQuestion, toProductReview } from "@/lib/data/prisma/mappers";
import { getPrisma } from "@/lib/db/prisma";

export const prismaReviewRepository: ReviewRepository = {
  async listReviewsByProductSlug(slug) {
    const rows = await getPrisma().productReview.findMany({
      // Only moderated reviews are public.
      where: { product: { slug }, status: "PUBLISHED" },
      select: {
        id: true,
        authorName: true,
        rating: true,
        title: true,
        body: true,
        createdAt: true,
        product: { select: { slug: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toProductReview);
  },

  async listQuestionsByProductSlug(slug) {
    const rows = await getPrisma().productQuestion.findMany({
      where: { product: { slug }, status: "ANSWERED" },
      select: {
        id: true,
        askerName: true,
        question: true,
        answer: true,
        answeredBy: true,
        createdAt: true,
        product: { select: { slug: true } },
      },
      // Oldest first, so an answered question stays where readers saw it.
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toProductQuestion);
  },
};
