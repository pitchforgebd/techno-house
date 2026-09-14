"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { notifySuccess } from "@/components/ui/feedback-provider";
import {
  AdminFormCard,
  AdminFormLabel,
  adminFormControlClass,
} from "@/features/admin/products/admin-product-form-primitives";
import { answerAdminQuestionAction } from "@/features/admin/questions/question-actions";
import type { AdminProductQuestion } from "@/lib/admin/questions-mock";

export function AdminQuestionAnswerForm({
  question,
  canAnswer,
}: {
  question: AdminProductQuestion;
  canAnswer: boolean;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState(question.answer ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    if (!canAnswer) {
      setError("You do not have permission to answer questions.");
      return;
    }
    startTransition(async () => {
      const result = await answerAdminQuestionAction({
        id: question.id,
        answer,
      });
      if (!result.ok) {
        setError(result.formError ?? "Could not save the answer.");
        return;
      }
      notifySuccess("Answer published");
      router.push("/admin/questions");
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-10">
      <div>
        <Link
          href="/admin/questions"
          className="text-sm font-medium text-[#3897f0] hover:underline"
        >
          Back to questions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          Answer question
        </h1>
        <p className="mt-1 text-sm text-neutral-500">{question.productName}</p>
      </div>

      {error ? (
        <Alert tone="danger" title="Cannot save">
          <p className="text-caption">{error}</p>
        </Alert>
      ) : null}

      <AdminFormCard title="Question details">
        <div className="space-y-1 text-sm">
          <p className="font-medium text-neutral-900">{question.question}</p>
          <p className="text-neutral-500">
            {question.customerName}
            {question.customerEmail
              ? ` · ${question.customerEmail}`
              : ""} · {question.date}
          </p>
        </div>
      </AdminFormCard>

      <AdminFormCard title="Your answer">
        <div className="space-y-1.5">
          <AdminFormLabel htmlFor="question-answer">Answer</AdminFormLabel>
          <textarea
            id="question-answer"
            rows={5}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className={adminFormControlClass}
            placeholder="Write a public answer for the product page..."
          />
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="rounded-lg bg-[#3897f0] px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#2d7fd4] disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </AdminFormCard>
    </div>
  );
}
