import type { ProductQuestion, ProductReview } from "@/lib/data/types/reviews";

const mockReviews: ProductReview[] = [
  {
    id: "rev-lumen-1",
    productSlug: "lumen-14-office-laptop",
    authorName: "A. Rahman",
    rating: 5,
    title: "Solid for office work",
    body: "Quiet fan and enough memory for documents and browser tabs. Battery lasts a full workday for me.",
    createdAt: "2026-07-12",
  },
  {
    id: "rev-lumen-2",
    productSlug: "lumen-14-office-laptop",
    authorName: "N. Chowdhury",
    rating: 4,
    title: "Good value display",
    body: "Screen is clear for spreadsheets. Wish the keyboard travel was a bit deeper, but fine overall.",
    createdAt: "2026-06-28",
  },
  {
    id: "rev-ridge-1",
    productSlug: "ridge-16-gaming-laptop",
    authorName: "S. Islam",
    rating: 4,
    title: "Handles mid-range games",
    body: "Plays current titles at comfortable settings. Gets warm under load, so keep vents clear.",
    createdAt: "2026-08-02",
  },
  {
    id: "rev-ridge-2",
    productSlug: "ridge-16-gaming-laptop",
    authorName: "M. Karim",
    rating: 5,
    title: "Fast storage upgrade path",
    body: "Boots quickly and has room for another drive. Display is bright enough for evening sessions.",
    createdAt: "2026-07-19",
  },
];

const mockQuestions: ProductQuestion[] = [
  {
    id: "q-lumen-1",
    productSlug: "lumen-14-office-laptop",
    askerName: "Guest",
    question: "Does this model include a charger in the box?",
    answer: "Yes. The box includes the laptop and the matching power adapter.",
    answeredBy: "Techno House",
    createdAt: "2026-07-01",
  },
  {
    id: "q-lumen-2",
    productSlug: "lumen-14-office-laptop",
    askerName: "T. Hasan",
    question: "Can I upgrade the RAM later?",
    answer: null,
    answeredBy: null,
    createdAt: "2026-08-10",
  },
  {
    id: "q-ridge-1",
    productSlug: "ridge-16-gaming-laptop",
    askerName: "Guest",
    question: "Is an external mouse required for gaming?",
    answer:
      "Not required. The trackpad works for casual use; many buyers prefer a mouse for longer sessions.",
    answeredBy: "Techno House",
    createdAt: "2026-07-22",
  },
];

export const mockReviewRepository = {
  async listReviewsByProductSlug(slug: string): Promise<ProductReview[]> {
    return mockReviews.filter((review) => review.productSlug === slug);
  },

  async listQuestionsByProductSlug(slug: string): Promise<ProductQuestion[]> {
    return mockQuestions.filter((item) => item.productSlug === slug);
  },
};
