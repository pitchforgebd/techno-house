/**
 * Customer review and question writes (P12-T06).
 *
 * New rows start pending. Storefront catalogues only show published reviews
 * and answered questions.
 */
import {
  parseCustomerReviewInput,
  type AdminReviewStatus,
  type CustomerReviewInputFields,
  type CustomerReviewView,
} from "@/lib/catalog/review-input";
import {
  parseCustomerQuestionInput,
  type CustomerQuestionInputFields,
  type CustomerQuestionView,
} from "@/lib/catalog/question-input";
import { getPrisma } from "@/lib/db/prisma";
import {
  notifyStaffSafe,
  STAFF_ALERT_TYPES,
} from "@/lib/orders/staff-order-alerts";
import type {
  ModerationStatus,
  QuestionStatus,
} from "@/lib/generated/prisma/enums";

export const CUSTOMER_REVIEW_DB_REQUIRED =
  "Reviews need the database. Turn off DATA_SOURCE=mock to save.";

export type CustomerMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type CustomerActor = {
  userId: string;
  email: string;
  fullName: string;
};

export type { CustomerReviewView, CustomerQuestionView };

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function toReviewStatus(status: ModerationStatus): AdminReviewStatus {
  if (status === "PUBLISHED") {
    return "published";
  }
  if (status === "REJECTED") {
    return "rejected";
  }
  return "pending";
}

function toQuestionStatus(status: QuestionStatus): "pending" | "answered" {
  return status === "ANSWERED" ? "answered" : "pending";
}

async function findActiveProduct(slug: string) {
  return getPrisma().product.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true },
  });
}

export async function createCustomerReview(input: {
  fields: CustomerReviewInputFields;
  actor: CustomerActor;
}): Promise<CustomerMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CUSTOMER_REVIEW_DB_REQUIRED };
  }
  const parsed = parseCustomerReviewInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }

  const product = await findActiveProduct(parsed.value.productSlug);
  if (!product) {
    return { ok: false, formError: "That product is not available." };
  }

  const created = await getPrisma().productReview.create({
    data: {
      productId: product.id,
      userId: input.actor.userId,
      authorName: input.actor.fullName,
      rating: parsed.value.rating,
      title: parsed.value.title,
      body: parsed.value.body,
      status: "PENDING",
      isStaffEntry: false,
    },
    select: { id: true },
  });
  notifyStaffSafe({
    type: STAFF_ALERT_TYPES.REVIEW_PENDING,
    title: "New product review",
    body: `${input.actor.fullName} · ${product.name} · ${parsed.value.rating}★`,
    href: `/admin/reviews/${product.slug}`,
  });
  return { ok: true, id: created.id };
}

export async function createCustomerQuestion(input: {
  fields: CustomerQuestionInputFields;
  actor: CustomerActor;
}): Promise<CustomerMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CUSTOMER_REVIEW_DB_REQUIRED };
  }
  const parsed = parseCustomerQuestionInput(input.fields);
  if (!parsed.ok) {
    return parsed;
  }

  const product = await findActiveProduct(parsed.value.productSlug);
  if (!product) {
    return { ok: false, formError: "That product is not available." };
  }

  const created = await getPrisma().productQuestion.create({
    data: {
      productId: product.id,
      userId: input.actor.userId,
      askerName: input.actor.fullName,
      askerEmail: input.actor.email,
      question: parsed.value.question,
      status: "PENDING",
    },
    select: { id: true },
  });
  notifyStaffSafe({
    type: STAFF_ALERT_TYPES.QUESTION_PENDING,
    title: "New product question",
    body: `${input.actor.fullName} · ${product.name}`,
    href: `/admin/questions/${created.id}`,
  });
  return { ok: true, id: created.id };
}

export async function listCustomerReviews(
  userId: string,
): Promise<CustomerReviewView[]> {
  if (!usesCatalogDatabase()) {
    return [];
  }
  const rows = await getPrisma().productReview.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      authorName: true,
      rating: true,
      title: true,
      body: true,
      status: true,
      createdAt: true,
      product: { select: { slug: true, name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    productSlug: row.product.slug,
    productName: row.product.name,
    authorName: row.authorName,
    rating: row.rating,
    title: row.title ?? "",
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    status: toReviewStatus(row.status),
  }));
}

export async function listCustomerQuestions(
  userId: string,
): Promise<CustomerQuestionView[]> {
  if (!usesCatalogDatabase()) {
    return [];
  }
  const rows = await getPrisma().productQuestion.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      askerName: true,
      question: true,
      answer: true,
      status: true,
      createdAt: true,
      product: { select: { slug: true, name: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    productSlug: row.product.slug,
    productName: row.product.name,
    askerName: row.askerName,
    question: row.question,
    answer: row.answer,
    createdAt: row.createdAt.toISOString(),
    status: toQuestionStatus(row.status),
  }));
}

export async function listOwnPendingReviewsForProduct(
  userId: string,
  productSlug: string,
): Promise<CustomerReviewView[]> {
  const items = await listCustomerReviews(userId);
  return items.filter(
    (item) =>
      item.productSlug === productSlug &&
      (item.status === "pending" || item.status === "rejected"),
  );
}

export async function listOwnPendingQuestionsForProduct(
  userId: string,
  productSlug: string,
): Promise<CustomerQuestionView[]> {
  const items = await listCustomerQuestions(userId);
  return items.filter(
    (item) => item.productSlug === productSlug && item.status === "pending",
  );
}

export async function deleteCustomerReview(input: {
  id: string;
  userId: string;
}): Promise<CustomerMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CUSTOMER_REVIEW_DB_REQUIRED };
  }
  const existing = await getPrisma().productReview.findUnique({
    where: { id: input.id.trim() },
    select: { id: true, userId: true, status: true },
  });
  if (!existing || existing.userId !== input.userId) {
    return { ok: false, formError: "That review no longer exists." };
  }
  if (existing.status !== "PENDING") {
    return { ok: false, formError: "Only pending reviews can be removed." };
  }
  await getPrisma().productReview.delete({ where: { id: existing.id } });
  return { ok: true, id: existing.id };
}

export async function deleteCustomerQuestion(input: {
  id: string;
  userId: string;
}): Promise<CustomerMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: CUSTOMER_REVIEW_DB_REQUIRED };
  }
  const existing = await getPrisma().productQuestion.findUnique({
    where: { id: input.id.trim() },
    select: { id: true, userId: true, status: true },
  });
  if (!existing || existing.userId !== input.userId) {
    return { ok: false, formError: "That question no longer exists." };
  }
  if (existing.status !== "PENDING") {
    return { ok: false, formError: "Only pending questions can be removed." };
  }
  await getPrisma().productQuestion.delete({ where: { id: existing.id } });
  return { ok: true, id: existing.id };
}
