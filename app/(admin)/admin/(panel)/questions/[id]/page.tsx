import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClassName } from "@/components/ui/button";
import { AdminQuestionAnswerForm } from "@/features/admin/questions/admin-question-answer-form";
import { loadAdminQuestionById } from "@/lib/admin/load-questions";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const question = await loadAdminQuestionById(id);
  return {
    title: question ? "Answer question" : "Question not found",
  };
}

export default async function AdminQuestionAnswerPage({ params }: Props) {
  const session = await requireStaffSession();
  const { id } = await params;
  const question = await loadAdminQuestionById(id);

  if (!question) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          title="Question not found"
          description="This product question is not in the catalogue."
        />
        <p className="mt-6 text-center">
          <Link
            href="/admin/questions"
            className={buttonClassName({ variant: "secondary", size: "sm" })}
          >
            Back to questions
          </Link>
        </p>
      </div>
    );
  }

  return (
    <AdminQuestionAnswerForm
      question={question}
      canAnswer={hasPermission(session, "questions.answer")}
    />
  );
}
