"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { notifyError, notifySuccess } from "@/components/ui/feedback-provider";
import { createCustomerQuestionAction } from "@/features/account/conversation-actions";
import { useCustomerSession } from "@/features/account/customer-session-provider";
import { createGuestQuestionAction } from "@/features/product/guest-feedback-actions";
import { HoneypotField } from "@/features/product/honeypot-field";
import { validatePdpQuestionInput } from "@/lib/account/mock-conversations";
import {
  GUEST_EMAIL_MAX,
  GUEST_NAME_MAX,
  validateGuestIdentity,
} from "@/lib/catalog/guest-feedback-input";
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
  // Visitors without an account: a name, an optional email (so staff can reach
  // them), a hidden honeypot, and a thank-you note (they have no "my questions"
  // list to see the pending question in).
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [sentAsGuest, setSentAsGuest] = useState(false);
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
    const nextErrors = validatePdpQuestionInput({ question });
    if (!session) {
      Object.assign(nextErrors, validateGuestIdentity({ name, email }));
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    startTransition(async () => {
      const result = session
        ? await createCustomerQuestionAction({ productSlug, question })
        : await createGuestQuestionAction({
            productSlug,
            question,
            name,
            email,
            website,
          });
      if (!result.ok) {
        notifyError(result.formError ?? "Could not submit the question.");
        return;
      }
      setQuestion("");
      setErrors({});
      if (session) {
        notifySuccess({
          title: "Question submitted",
          description: "It stays private until staff answers it.",
        });
        router.refresh();
      } else {
        setSentAsGuest(true);
        notifySuccess({
          title: "Question received",
          description: "Thank you! It stays private until staff answers it.",
        });
      }
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
        {sentAsGuest ? (
          <p
            role="status"
            className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-body text-text"
          >
            Thank you! Your question was received. It stays private until staff
            answers it.
          </p>
        ) : null}
        <form
          className="space-y-4 border border-border bg-surface px-4 py-4 sm:px-5"
          onSubmit={handleSubmit}
          noValidate
        >
          {session ? (
            <p className="text-caption text-text-muted">
              Signed in as{" "}
              <span className="font-medium text-text">{session.fullName}</span>
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Your name"
                htmlFor="pdp-question-name"
                error={errors.name}
              >
                <Input
                  id="pdp-question-name"
                  value={name}
                  placeholder="Your name"
                  maxLength={GUEST_NAME_MAX}
                  autoComplete="name"
                  onChange={(event) => {
                    setName(event.target.value);
                    setSentAsGuest(false);
                  }}
                />
              </Field>
              <Field
                label="Email (optional)"
                htmlFor="pdp-question-email"
                error={errors.email}
              >
                <Input
                  id="pdp-question-email"
                  type="email"
                  value={email}
                  placeholder="So we can reach you"
                  maxLength={GUEST_EMAIL_MAX}
                  autoComplete="email"
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setSentAsGuest(false);
                  }}
                />
              </Field>
            </div>
          )}
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
              onChange={(event) => {
                setQuestion(event.target.value);
                setSentAsGuest(false);
              }}
              rows={4}
            />
          </Field>
          {session ? null : (
            <HoneypotField value={website} onChange={setWebsite} />
          )}
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Submitting…" : "Submit question"}
          </Button>
        </form>
        {session ? null : (
          <p className="text-caption text-text-muted">
            Have an account?{" "}
            <Link
              href={`/account/login?next=${encodeURIComponent(pathname)}`}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Sign in
            </Link>{" "}
            to keep track of your questions.
          </p>
        )}
      </div>
    </div>
  );
}
