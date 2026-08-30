import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "FAQ — Techno House",
};

export default function FaqPage() {
  return (
    <ContentStub
      heading="FAQ"
      title="Frequently asked questions"
      description="Answers to common questions will appear here."
    />
  );
}
