/**
 * Review input helpers (P12-T06).
 * Safe to import from Client Components — no Prisma.
 */

export const REVIEWER_NAME_MAX = 80;
export const REVIEW_TITLE_MAX = 80;
export const REVIEW_BODY_MAX = 1000;
export const REVIEW_BODY_MIN = 12;

export type AdminReviewStatus = "pending" | "published" | "rejected";

export type StaffReviewInputFields = {
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  customDate: string | null;
};

export type ParsedStaffReviewInput = {
  productId: string;
  reviewerName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: Date | null;
};

export type CustomerReviewInputFields = {
  productSlug: string;
  rating: number;
  title: string;
  body: string;
};

export type CustomerReviewView = {
  id: string;
  productSlug: string;
  productName: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  status: AdminReviewStatus;
};

export type ParsedCustomerReviewInput = {
  productSlug: string;
  rating: number;
  title: string;
  body: string;
};

export function clampReviewRating(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  const rounded = Math.round(raw);
  if (rounded < 1 || rounded > 5) {
    return 0;
  }
  return rounded;
}

export function reviewTitleFromBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return "Customer review";
  }
  const firstLine = trimmed.split("\n")[0]?.trim() ?? trimmed;
  return firstLine.slice(0, REVIEW_TITLE_MAX);
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }
  const parsed = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

export function parseStaffReviewInput(
  input: StaffReviewInputFields,
):
  | { ok: true; value: ParsedStaffReviewInput }
  | { ok: false; formError: string } {
  const productId = input.productId.trim();
  if (!productId) {
    return { ok: false, formError: "Select a product." };
  }

  const reviewerName = input.reviewerName.trim();
  if (!reviewerName) {
    return { ok: false, formError: "Enter a reviewer name." };
  }
  if (reviewerName.length > REVIEWER_NAME_MAX) {
    return { ok: false, formError: "Reviewer name is too long." };
  }

  const rating = clampReviewRating(input.rating);
  if (rating < 1) {
    return { ok: false, formError: "Select a rating." };
  }

  const body = input.comment.trim();
  if (!body) {
    return { ok: false, formError: "Enter a review comment." };
  }
  if (body.length > REVIEW_BODY_MAX) {
    return { ok: false, formError: "Review comment is too long." };
  }

  let createdAt: Date | null = null;
  if (input.customDate) {
    createdAt = parseIsoDate(input.customDate);
    if (!createdAt) {
      return { ok: false, formError: "Select a valid date." };
    }
  }

  return {
    ok: true,
    value: {
      productId,
      reviewerName,
      rating,
      title: reviewTitleFromBody(body),
      body,
      createdAt,
    },
  };
}

export function parseCustomerReviewInput(
  input: CustomerReviewInputFields,
):
  | { ok: true; value: ParsedCustomerReviewInput }
  | { ok: false; formError: string } {
  const productSlug = input.productSlug.trim();
  if (!productSlug) {
    return { ok: false, formError: "Select a product." };
  }

  const rating = clampReviewRating(input.rating);
  if (rating < 1) {
    return { ok: false, formError: "Choose a rating from 1 to 5 stars." };
  }

  const body = input.body.trim();
  if (body.length < REVIEW_BODY_MIN) {
    return {
      ok: false,
      formError: `Write at least ${REVIEW_BODY_MIN} characters.`,
    };
  }
  if (body.length > REVIEW_BODY_MAX) {
    return { ok: false, formError: "Review is too long." };
  }

  const title = (input.title.trim() || reviewTitleFromBody(body)).slice(
    0,
    REVIEW_TITLE_MAX,
  );

  return {
    ok: true,
    value: { productSlug, rating, title, body },
  };
}

export function parseReviewStatus(value: string): AdminReviewStatus | null {
  if (value === "pending" || value === "published" || value === "rejected") {
    return value;
  }
  return null;
}
