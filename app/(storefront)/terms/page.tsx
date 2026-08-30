import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Terms — Techno House",
};

export default function TermsPage() {
  return (
    <ContentStub
      heading="Terms"
      title="Terms of use"
      description="The terms of use will appear here."
    />
  );
}
