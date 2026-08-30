import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "About — Techno House",
};

export default function AboutPage() {
  return (
    <ContentStub
      heading="About"
      title="About Techno House"
      description="Our story will appear here. This page is a placeholder, not copied from another retailer."
    />
  );
}
