import type { Metadata } from "next";
import { AdminQuestionsList } from "@/features/admin/questions/admin-questions-list";
import { loadAdminQuestionList } from "@/lib/admin/load-questions";
import { hasPermission } from "@/lib/auth/permissions";
import { requireStaffSession } from "@/lib/auth/staff-session";

export const metadata: Metadata = {
  title: "Product Questions",
};

export default async function AdminQuestionsPage() {
  const session = await requireStaffSession();
  const items = await loadAdminQuestionList();
  return (
    <AdminQuestionsList
      items={items}
      canAnswer={hasPermission(session, "questions.answer")}
      canDelete={hasPermission(session, "questions.delete")}
    />
  );
}
