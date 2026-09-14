/**
 * Admin product-question persistence (P12-T06).
 *
 * Storefront reads stay on ReviewRepository (answered rows only). These
 * helpers include pending questions and write answers to PostgreSQL.
 */
import { AUDIT_ACTIONS, writeAuditLog } from "@/lib/auth/audit-log";
import { parseQuestionAnswer } from "@/lib/catalog/question-input";
import { getPrisma } from "@/lib/db/prisma";
import type { AdminProductQuestion } from "@/lib/admin/questions-mock";

export const QUESTION_DB_REQUIRED =
  "Question changes need the database. Turn off DATA_SOURCE=mock to save.";

export type QuestionMutationResult =
  { ok: true; id: string } | { ok: false; formError: string };

export type QuestionActor = {
  staffId: string;
  email: string;
  fullName: string;
  ip?: string | null;
};

function usesCatalogDatabase(): boolean {
  return process.env.DATA_SOURCE !== "mock";
}

function toAdminQuestion(row: {
  id: string;
  createdAt: Date;
  question: string;
  askerName: string;
  askerEmail: string | null;
  answer: string | null;
  status: "PENDING" | "ANSWERED";
  product: { name: string; slug: string };
}): AdminProductQuestion {
  return {
    id: row.id,
    date: row.createdAt.toISOString().slice(0, 10),
    productName: row.product.name,
    productSlug: row.product.slug,
    question: row.question,
    customerName: row.askerName,
    customerEmail: row.askerEmail ?? "",
    status: row.status === "ANSWERED" ? "answered" : "pending",
    answer: row.answer ?? undefined,
  };
}

const QUESTION_SELECT = {
  id: true,
  createdAt: true,
  question: true,
  askerName: true,
  askerEmail: true,
  answer: true,
  status: true,
  product: { select: { name: true, slug: true } },
} as const;

async function recordQuestionAudit(
  actor: QuestionActor | undefined,
  action: string,
  record: { id: string },
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!actor) {
    return;
  }
  await writeAuditLog({
    actorType: "STAFF",
    actorId: actor.staffId,
    actorLabel: actor.email,
    action,
    entityType: "ProductQuestion",
    entityId: record.id,
    ip: actor.ip,
    metadata,
  });
}

export async function listAdminQuestionRecords(): Promise<
  AdminProductQuestion[]
> {
  const rows = await getPrisma().productQuestion.findMany({
    orderBy: [{ status: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    select: QUESTION_SELECT,
  });
  return rows.map(toAdminQuestion);
}

export async function getAdminQuestionRecord(
  id: string,
): Promise<AdminProductQuestion | null> {
  const trimmed = id.trim();
  if (!trimmed) {
    return null;
  }
  const row = await getPrisma().productQuestion.findUnique({
    where: { id: trimmed },
    select: QUESTION_SELECT,
  });
  return row ? toAdminQuestion(row) : null;
}

export async function answerAdminQuestion(input: {
  id: string;
  answer: string;
  actor?: QuestionActor;
}): Promise<QuestionMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: QUESTION_DB_REQUIRED };
  }
  const parsed = parseQuestionAnswer(input.answer);
  if (!parsed.ok) {
    return parsed;
  }

  const existing = await getPrisma().productQuestion.findUnique({
    where: { id: input.id.trim() },
    select: {
      id: true,
      product: { select: { slug: true, name: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That question no longer exists." };
  }

  const answeredBy = input.actor?.fullName?.trim() || "Techno House";
  await getPrisma().productQuestion.update({
    where: { id: existing.id },
    data: {
      answer: parsed.value,
      answeredBy,
      answeredAt: new Date(),
      status: "ANSWERED",
    },
  });

  await recordQuestionAudit(
    input.actor,
    AUDIT_ACTIONS.QUESTION_ANSWER,
    existing,
    {
      productSlug: existing.product.slug,
      productName: existing.product.name,
    },
  );
  return { ok: true, id: existing.id };
}

export async function deleteAdminQuestion(input: {
  id: string;
  actor?: QuestionActor;
}): Promise<QuestionMutationResult> {
  if (!usesCatalogDatabase()) {
    return { ok: false, formError: QUESTION_DB_REQUIRED };
  }

  const existing = await getPrisma().productQuestion.findUnique({
    where: { id: input.id.trim() },
    select: {
      id: true,
      product: { select: { slug: true, name: true } },
    },
  });
  if (!existing) {
    return { ok: false, formError: "That question no longer exists." };
  }

  await getPrisma().productQuestion.delete({ where: { id: existing.id } });
  await recordQuestionAudit(
    input.actor,
    AUDIT_ACTIONS.QUESTION_DELETE,
    existing,
    {
      productSlug: existing.product.slug,
      productName: existing.product.name,
    },
  );
  return { ok: true, id: existing.id };
}

export { usesCatalogDatabase };
