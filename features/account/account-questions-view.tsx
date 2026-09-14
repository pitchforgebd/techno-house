"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { AccountShell } from "@/features/account/account-shell";
import {
  createCustomerQuestionAction,
  deleteCustomerQuestionAction,
} from "@/features/account/conversation-actions";
import { ProductPickerField } from "@/features/account/product-picker-field";
import { validateMockQuestionInput } from "@/lib/account/mock-conversations";
import { QUESTION_MAX } from "@/lib/catalog/question-input";
import type { CustomerQuestionView } from "@/lib/catalog/question-input";

export function AccountQuestionsView({
  questions,
}: {
  questions: CustomerQuestionView[];
}) {
  const router = useRouter();
  const [productSlug, setProductSlug] = useState("");
  const [question, setQuestion] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMockQuestionInput({ productSlug, question });
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
        notifyError(result.formError ?? "Could not save the question.");
        return;
      }
      setQuestion("");
      notifySuccess("Question submitted");
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const result = await deleteCustomerQuestionAction(id);
      if (!result.ok) {
        notifyError(result.formError ?? "Could not remove the question.");
        return;
      }
      notifySuccess("Question removed");
      router.refresh();
    });
  }

  return (
    <AccountShell title="Questions">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          Questions stay private until staff publish an answer on the product
          page.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <ProductPickerField
            id="question-product"
            label="Product"
            value={productSlug}
            error={errors.productSlug}
            onChange={(slug) => {
              setProductSlug(slug);
            }}
          />
          <Field
            label="Question"
            htmlFor="question-body"
            error={errors.question}
          >
            <Textarea
              id="question-body"
              value={question}
              maxLength={QUESTION_MAX}
              onChange={(event) => setQuestion(event.target.value)}
            />
          </Field>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Submit question"}
          </Button>
        </form>

        {questions.length === 0 ? (
          <p className="text-body text-text-muted">No questions yet.</p>
        ) : (
          <ul className="space-y-3">
            {questions.map((item) => {
              const placedAt = new Date(item.createdAt).toLocaleString(
                "en-GB",
                { dateStyle: "medium", timeStyle: "short" },
              );
              return (
                <li
                  key={item.id}
                  className="rounded-md border border-border bg-surface px-4 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-label font-semibold text-text">
                      Q: {item.question}
                    </p>
                    <Badge tone="neutral">
                      {item.status === "answered" ? "Answered" : "Pending"}
                    </Badge>
                  </div>
                  {item.answer ? (
                    <p className="mt-2 text-caption text-text-muted">
                      A: {item.answer}
                    </p>
                  ) : (
                    <p className="mt-2 text-caption text-text-muted">
                      Awaiting an answer.
                    </p>
                  )}
                  <p className="mt-2 text-caption text-text-muted">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {item.productName}
                    </Link>
                    {" · "}
                    {placedAt}
                  </p>
                  {item.status === "pending" ? (
                    <button
                      type="button"
                      disabled={pending}
                      className={buttonClassName({
                        variant: "ghost",
                        size: "sm",
                        className: "mt-2 self-start px-0",
                      })}
                      onClick={() => handleDelete(item.id)}
                    >
                      Remove
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}
