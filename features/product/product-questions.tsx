"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { createCustomerQuestionAction } from "@/features/account/conversation-actions";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import { validatePdpQuestionInput } from "@/lib/account/mock-conversations";
import { QUESTION_MAX } from "@/lib/catalog/question-input";
import type { CustomerQuestionView } from "@/lib/catalog/question-input";
import type { ProductQuestion } from "@/lib/data";

type ProductQuestionsProps = {
  catalogQuestions: ProductQuestion[];
  ownQuestions: CustomerQuestionView[];
  productSlug: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ProductQuestions({
  catalogQuestions,
  ownQuestions,
  productSlug,
}: ProductQuestionsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useCustomerSession();
  const [question, setQuestion] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const allQuestions = useMemo(() => {
    const mapped = ownQuestions.map((item) => ({
      id: item.id,
      question: item.question,
      askerName: item.askerName,
      createdAt: item.createdAt,
      answer: item.answer,
      answeredBy: null as string | null,
      pending: true as const,
    }));
    const catalog = catalogQuestions.map((item) => ({
      id: item.id,
      question: item.question,
      askerName: item.askerName,
      createdAt: item.createdAt,
      answer: item.answer,
      answeredBy: item.answeredBy,
      pending: false as const,
    }));
    return [...mapped, ...catalog];
  }, [catalogQuestions, ownQuestions]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) {
      return;
    }
    const nextErrors = validatePdpQuestionInput({ question });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    startTransition(async () => {
      const result = await createCustomerQuestionAction({
        productSlug,
        question,
      });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not submit the question.");
        return;
      }
      setQuestion("");
      setErrors({});
      notifySuccess({
        title: "Question submitted",
        description: "It stays private until staff answers it.",
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-text">
          Customer questions
        </h2>
        <p className="mt-1 text-body text-text-muted">
          {catalogQuestions.length === 0
            ? "No questions asked yet."
            : `${catalogQuestions.length} ${catalogQuestions.length === 1 ? "question" : "questions"}.`}
        </p>
      </div>

      {allQuestions.length > 0 ? (
        <ul className="space-y-3">
          {allQuestions.map((item) => (
            <li
              key={item.id}
              className="rounded-md border border-border bg-surface px-4 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-label font-semibold text-text">
                  Q: {item.question}
                </p>
                {item.pending ? (
                  <Badge tone="neutral">Your question</Badge>
                ) : null}
              </div>
              <p className="mt-1 text-caption text-text-muted">
                Asked by {item.askerName} ·{" "}
                <time dateTime={item.createdAt}>
                  {formatWhen(item.createdAt)}
                </time>
              </p>
              {item.answer ? (
                <div className="mt-3 rounded-md bg-surface-muted/70 px-3 py-2">
                  <p className="text-body text-text">A: {item.answer}</p>
                  {item.answeredBy ? (
                    <p className="mt-1 text-caption text-text-muted">
                      Answered by {item.answeredBy}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-caption text-text-muted">
                  Awaiting an answer.
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-3">
        <h3 className="text-label font-semibold text-text">
          Your question{" "}
          <span className="font-normal text-success">
            (Please don&apos;t use any links, &amp;, (, ), /, +, $, # symbols)
          </span>
        </h3>
        {!session ? (
          <p className="text-body text-text-muted">
            <Link
              href={`/account/login?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to ask a question about this product.
          </p>
        ) : (
          <form
            className="space-y-4 border border-border bg-surface px-4 py-4 sm:px-5"
            onSubmit={handleSubmit}
            noValidate
          >
            <p className="text-caption text-text-muted">
              Signed in as{" "}
              <span className="font-medium text-text">{session.fullName}</span>
            </p>
            <Field
              label="Question"
              htmlFor="pdp-question"
              error={errors.question}
            >
              <Textarea
                id="pdp-question"
                value={question}
                placeholder="Question"
                maxLength={QUESTION_MAX}
                onChange={(event) => setQuestion(event.target.value)}
                rows={4}
              />
            </Field>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Submitting…" : "Submit question"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
