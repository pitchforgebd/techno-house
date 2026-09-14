import type { Metadata } from "next";
import { AccountQuestionsView } from "@/features/account/account-questions-view";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { listCustomerQuestions } from "@/lib/catalog/customer-reviews";

export const metadata: Metadata = {
  title: "Questions — Techno House",
};

export default async function AccountQuestionsPage() {
  const session = await getCustomerSession();
  const questions = session ? await listCustomerQuestions(session.userId) : [];
  return <AccountQuestionsView questions={questions} />;
}
