"use server";

import { getRequestMeta } from "@/lib/auth/request-meta";
import { limitGuestContent } from "@/lib/auth/rate-limit";
import {
  CROSS_ORIGIN_ERROR,
  isSameOriginRequest,
} from "@/lib/auth/same-origin";
import {
  createGuestQuestion,
  createGuestReview,
  type CustomerMutationResult,
} from "@/lib/catalog/customer-reviews";
import {
  parseGuestEmail,
  parseGuestName,
  parseGuestReviewText,
} from "@/lib/catalog/guest-feedback-input";
import { parseCustomerQuestionInput } from "@/lib/catalog/question-input";
import { parseCustomerReviewInput } from "@/lib/catalog/review-input";

/**
 * Reviews and questions from visitors who are not signed in (AD-363).
 *
 * Open to anyone, so every defence a public write needs is here, in this order:
 *   1. same-origin check;
 *   2. honeypot — a bot that fills the hidden field is told "received" and
 *      nothing is stored (no error to learn from);
 *   3. input validation, BEFORE the rate limit, so a typo never burns the
 *      visitor's allowance;
 *   4. a per-caller rate limit (hashed IP, 5 an hour);
 *   5. the write itself, which only ever stores PENDING rows with no linked
 *      user — staff approve everything before it is shown.
 * Signed-in customers keep using `createCustomerReviewAction` /
 * `createCustomerQuestionAction`, which link the row to their account.
 */

const RECEIVED: CustomerMutationResult = { ok: true, id: "received" };

function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim() !== "";
}

export async function createGuestReviewAction(input: {
  productSlug: string;
  rating: number;
  body: string;
  name: string;
  /** Honeypot: hidden from people, so a real visitor always sends "". */
  website?: string;
}): Promise<CustomerMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  if (isHoneypotFilled(input.website)) {
    return RECEIVED;
  }

  const fields = {
    productSlug: String(input.productSlug ?? ""),
    rating: Number(input.rating),
    title: "",
    body: String(input.body ?? ""),
  };
  const name = parseGuestName(input.name);
  if (!name.ok) {
    return name;
  }
  const parsed = parseCustomerReviewInput(fields);
  if (!parsed.ok) {
    return parsed;
  }
  const text = parseGuestReviewText(parsed.value.body);
  if (!text.ok) {
    return text;
  }

  const meta = await getRequestMeta();
  const limited = await limitGuestContent(meta.ip);
  if (!limited.ok) {
    return limited;
  }
  return createGuestReview({ fields, name: input.name });
}

export async function createGuestQuestionAction(input: {
  productSlug: string;
  question: string;
  name: string;
  email?: string;
  /** Honeypot: hidden from people, so a real visitor always sends "". */
  website?: string;
}): Promise<CustomerMutationResult> {
  if (!(await isSameOriginRequest())) {
    return { ok: false, formError: CROSS_ORIGIN_ERROR };
  }
  if (isHoneypotFilled(input.website)) {
    return RECEIVED;
  }

  const fields = {
    productSlug: String(input.productSlug ?? ""),
    question: String(input.question ?? ""),
  };
  const name = parseGuestName(input.name);
  if (!name.ok) {
    return name;
  }
  const email = parseGuestEmail(input.email);
  if (!email.ok) {
    return email;
  }
  const parsed = parseCustomerQuestionInput(fields);
  if (!parsed.ok) {
    return parsed;
  }

  const meta = await getRequestMeta();
  const limited = await limitGuestContent(meta.ip);
  if (!limited.ok) {
    return limited;
  }
  return createGuestQuestion({ fields, name: input.name, email: input.email });
}
