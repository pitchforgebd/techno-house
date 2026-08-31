"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClassName } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { AccountShell } from "@/features/account/account-shell";
import { ProductPickerField } from "@/features/account/product-picker-field";
import { useMockConversations } from "@/features/account/use-mock-conversations";
import {
  QUESTION_MAX,
  createMockQuestionId,
  validateMockQuestionInput,
} from "@/lib/account/mock-conversations";

export function AccountQuestionsView() {
  const { questions, addQuestion, deleteQuestion } = useMockConversations();
  const [productSlug, setProductSlug] = useState("");
  const [productName, setProductName] = useState("");
  const [question, setQuestion] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateMockQuestionInput({ productSlug, question });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    addQuestion({
      id: createMockQuestionId(),
      productSlug,
      productName: productName || productSlug,
      askerName: "Customer",
      question: question.trim(),
      createdAt: new Date().toISOString(),
      status: "pending",
    });
    setQuestion("");
  }

  return (
    <AccountShell title="Questions">
      <div className="space-y-8">
        <p className="text-caption text-text-muted">
          Mock product questions stay on this device. Staff answers and PDP Q&A
          publishing are not live.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <ProductPickerField
            id="question-product"
            label="Product"
            value={productSlug}
            error={errors.productSlug}
            onChange={(slug, name) => {
              setProductSlug(slug);
              setProductName(name);
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
          <Button type="submit" size="sm">
            Save mock question
          </Button>
        </form>

        {questions.length === 0 ? (
          <p className="text-body text-text-muted">
            No mock questions on this device yet.
          </p>
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
                    <Badge tone="neutral">Pending</Badge>
                  </div>
                  <p className="mt-2 text-caption text-text-muted">
                    Awaiting an answer — not sent to staff.
                  </p>
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
                  <button
                    type="button"
                    className={buttonClassName({
                      variant: "ghost",
                      size: "sm",
                      className: "mt-2 self-start px-0",
                    })}
                    onClick={() => deleteQuestion(item.id)}
                  >
                    Remove from this device
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}
