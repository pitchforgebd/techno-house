/**
 * Product question input helpers (P12-T06).
 * Safe to import from Client Components — no Prisma.
 */

export const QUESTION_MAX = 400;
export const QUESTION_MIN = 12;
export const QUESTION_ANSWER_MAX = 2000;
export const QUESTION_FORBIDDEN_PATTERN = /[&,()/+$#]|https?:\/\//i;

export type CustomerQuestionInputFields = {
  productSlug: string;
  question: string;
};

export type ParsedCustomerQuestionInput = {
  productSlug: string;
  question: string;
};

export type CustomerQuestionView = {
  id: string;
  productSlug: string;
  productName: string;
  askerName: string;
  question: string;
  answer: string | null;
  createdAt: string;
  status: "pending" | "answered";
};

export function parseQuestionAnswer(
  answer: string,
): { ok: true; value: string } | { ok: false; formError: string } {
  const trimmed = answer.trim();
  if (!trimmed) {
    return { ok: false, formError: "Enter an answer." };
  }
  if (trimmed.length > QUESTION_ANSWER_MAX) {
    return { ok: false, formError: "Answer is too long." };
  }
  return { ok: true, value: trimmed };
}

export function parseCustomerQuestionInput(
  input: CustomerQuestionInputFields,
):
  | { ok: true; value: ParsedCustomerQuestionInput }
  | { ok: false; formError: string } {
  const productSlug = input.productSlug.trim();
  if (!productSlug) {
    return { ok: false, formError: "Select a product." };
  }

  const question = input.question.trim();
  if (question.length < QUESTION_MIN) {
    return {
      ok: false,
      formError: `Write at least ${QUESTION_MIN} characters.`,
    };
  }
  if (question.length > QUESTION_MAX) {
    return { ok: false, formError: "Question is too long." };
  }
  if (QUESTION_FORBIDDEN_PATTERN.test(question)) {
    return {
      ok: false,
      formError: "Do not use links or these symbols: & ( ) / + $ #",
    };
  }

  return { ok: true, value: { productSlug, question } };
}
