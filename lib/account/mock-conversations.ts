export const MOCK_CONVERSATIONS_KEY = "techno-house-mock-conversations-v1";
export const MAX_MOCK_REVIEWS = 20;
export const MAX_MOCK_QUESTIONS = 20;

export const REVIEW_TITLE_MAX = 80;
export const REVIEW_BODY_MAX = 1000;
export const REVIEW_BODY_MIN = 12;
export const QUESTION_MAX = 400;
export const QUESTION_MIN = 12;

export type MockModerationStatus = "pending";

export type MockAccountReview = {
  id: string;
  productSlug: string;
  productName: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  status: MockModerationStatus;
};

export type MockAccountQuestion = {
  id: string;
  productSlug: string;
  productName: string;
  question: string;
  createdAt: string;
  status: MockModerationStatus;
};

export type MockConversationsState = {
  reviews: MockAccountReview[];
  questions: MockAccountQuestion[];
};

export const EMPTY_CONVERSATIONS: MockConversationsState = {
  reviews: [],
  questions: [],
};

export function createMockReviewId(): string {
  return `THR-${Date.now().toString(36).toUpperCase()}`;
}

export function createMockQuestionId(): string {
  return `THQ-${Date.now().toString(36).toUpperCase()}`;
}

export function clampRating(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  const rounded = Math.round(raw);
  if (rounded < 1 || rounded > 5) {
    return 0;
  }
  return rounded;
}

export function validateMockReviewInput(input: {
  productSlug: string;
  rating: string;
  title: string;
  body: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.productSlug.trim()) {
    errors.productSlug = "Select a product.";
  }
  const rating = Number(input.rating);
  if (!input.rating || !Number.isFinite(rating) || rating < 1 || rating > 5) {
    errors.rating = "Choose a rating from 1 to 5.";
  }
  const title = input.title.trim();
  if (!title) {
    errors.title = "Enter a title.";
  } else if (title.length > REVIEW_TITLE_MAX) {
    errors.title = `Use at most ${REVIEW_TITLE_MAX} characters.`;
  }
  const body = input.body.trim();
  if (body.length < REVIEW_BODY_MIN) {
    errors.body = `Write at least ${REVIEW_BODY_MIN} characters.`;
  } else if (body.length > REVIEW_BODY_MAX) {
    errors.body = `Use at most ${REVIEW_BODY_MAX} characters.`;
  }
  return errors;
}

export function validateMockQuestionInput(input: {
  productSlug: string;
  question: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.productSlug.trim()) {
    errors.productSlug = "Select a product.";
  }
  const question = input.question.trim();
  if (question.length < QUESTION_MIN) {
    errors.question = `Write at least ${QUESTION_MIN} characters.`;
  } else if (question.length > QUESTION_MAX) {
    errors.question = `Use at most ${QUESTION_MAX} characters.`;
  }
  return errors;
}

function parseReview(raw: unknown): MockAccountReview | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<MockAccountReview>;
  if (typeof data.id !== "string" || typeof data.productSlug !== "string") {
    return null;
  }
  if (typeof data.title !== "string" || typeof data.body !== "string") {
    return null;
  }
  if (typeof data.createdAt !== "string" || typeof data.rating !== "number") {
    return null;
  }
  const rating = clampRating(data.rating);
  if (rating < 1) {
    return null;
  }
  return {
    id: data.id.slice(0, 32),
    productSlug: data.productSlug.trim().slice(0, 80),
    productName:
      typeof data.productName === "string"
        ? data.productName.trim().slice(0, 120)
        : data.productSlug,
    rating,
    title: data.title.trim().slice(0, REVIEW_TITLE_MAX),
    body: data.body.trim().slice(0, REVIEW_BODY_MAX),
    createdAt: data.createdAt,
    status: "pending",
  };
}

function parseQuestion(raw: unknown): MockAccountQuestion | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const data = raw as Partial<MockAccountQuestion>;
  if (typeof data.id !== "string" || typeof data.productSlug !== "string") {
    return null;
  }
  if (typeof data.question !== "string" || typeof data.createdAt !== "string") {
    return null;
  }
  return {
    id: data.id.slice(0, 32),
    productSlug: data.productSlug.trim().slice(0, 80),
    productName:
      typeof data.productName === "string"
        ? data.productName.trim().slice(0, 120)
        : data.productSlug,
    question: data.question.trim().slice(0, QUESTION_MAX),
    createdAt: data.createdAt,
    status: "pending",
  };
}

export function normalizeMockConversations(
  raw: unknown,
): MockConversationsState {
  if (!raw || typeof raw !== "object") {
    return EMPTY_CONVERSATIONS;
  }
  const data = raw as Partial<MockConversationsState>;
  const reviews: MockAccountReview[] = [];
  const questions: MockAccountQuestion[] = [];
  const seenReviews = new Set<string>();
  const seenQuestions = new Set<string>();

  if (Array.isArray(data.reviews)) {
    for (const item of data.reviews) {
      const parsed = parseReview(item);
      if (!parsed || seenReviews.has(parsed.id)) {
        continue;
      }
      seenReviews.add(parsed.id);
      reviews.push(parsed);
      if (reviews.length >= MAX_MOCK_REVIEWS) {
        break;
      }
    }
  }

  if (Array.isArray(data.questions)) {
    for (const item of data.questions) {
      const parsed = parseQuestion(item);
      if (!parsed || seenQuestions.has(parsed.id)) {
        continue;
      }
      seenQuestions.add(parsed.id);
      questions.push(parsed);
      if (questions.length >= MAX_MOCK_QUESTIONS) {
        break;
      }
    }
  }

  return { reviews, questions };
}

export function appendMockReview(
  state: MockConversationsState,
  review: MockAccountReview,
): MockConversationsState {
  const parsed = parseReview(review);
  if (!parsed) {
    return state;
  }
  const rest = state.reviews.filter((item) => item.id !== parsed.id);
  return {
    ...state,
    reviews: [parsed, ...rest].slice(0, MAX_MOCK_REVIEWS),
  };
}

export function appendMockQuestion(
  state: MockConversationsState,
  question: MockAccountQuestion,
): MockConversationsState {
  const parsed = parseQuestion(question);
  if (!parsed) {
    return state;
  }
  const rest = state.questions.filter((item) => item.id !== parsed.id);
  return {
    ...state,
    questions: [parsed, ...rest].slice(0, MAX_MOCK_QUESTIONS),
  };
}

export function removeMockReview(
  state: MockConversationsState,
  id: string,
): MockConversationsState {
  return {
    ...state,
    reviews: state.reviews.filter((item) => item.id !== id),
  };
}

export function removeMockQuestion(
  state: MockConversationsState,
  id: string,
): MockConversationsState {
  return {
    ...state,
    questions: state.questions.filter((item) => item.id !== id),
  };
}

export function readStoredConversations(): MockConversationsState {
  if (typeof window === "undefined") {
    return EMPTY_CONVERSATIONS;
  }
  try {
    const raw = window.localStorage.getItem(MOCK_CONVERSATIONS_KEY);
    return raw
      ? normalizeMockConversations(JSON.parse(raw))
      : EMPTY_CONVERSATIONS;
  } catch {
    return EMPTY_CONVERSATIONS;
  }
}

export function persistConversations(state: MockConversationsState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      MOCK_CONVERSATIONS_KEY,
      JSON.stringify(normalizeMockConversations(state)),
    );
  } catch {
    // Ignore quota / private mode.
  }
}
