import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import type { ProductQuestion } from "@/lib/data";

type ProductQuestionsProps = {
  questions: ProductQuestion[];
};

export function ProductQuestions({ questions }: ProductQuestionsProps) {
  return (
    <div className="space-y-4">
      <p className="text-caption text-text-muted">
        Questions below are sample catalog content. Mock questions from your
        account stay on this device and are not published here.
      </p>
      {questions.length === 0 ? (
        <EmptyState
          title="No questions yet"
          description="Sample catalog questions will list here when a product has them. You can save a mock question in your account."
          action={
            <Link
              href="/account/questions"
              className="text-label font-medium text-primary underline-offset-2 hover:underline"
            >
              Ask a mock question
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {questions.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-border bg-surface px-4 py-3"
              >
                <p className="text-label font-semibold text-text">
                  Q: {item.question}
                </p>
                <p className="mt-1 text-caption text-text-muted">
                  Asked by {item.askerName} ·{" "}
                  <time dateTime={item.createdAt}>{item.createdAt}</time>
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
          <p className="text-caption text-text-muted">
            To practice a question form, use{" "}
            <Link
              href="/account/questions"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              account questions
            </Link>
            . Those entries are not shown on this page.
          </p>
        </>
      )}
    </div>
  );
}
