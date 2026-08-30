import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Support — Techno House",
};

export default function SupportPage() {
  return (
    <ContentStub
      heading="Support"
      title="Support hub"
      description="Support options will appear here."
    />
  );
}
