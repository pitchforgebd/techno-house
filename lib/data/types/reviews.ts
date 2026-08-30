export type ProductReview = {
  id: string;
  productSlug: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
};

export type ProductQuestion = {
  id: string;
  productSlug: string;
  askerName: string;
  question: string;
  answer: string | null;
  answeredBy: string | null;
  createdAt: string;
};
