import type { Metadata } from "next";
import { AccountQuestionsView } from "@/features/account/account-questions-view";

export const metadata: Metadata = {
  title: "Questions — Techno House",
};

export default function AccountQuestionsPage() {
  return <AccountQuestionsView />;
}
