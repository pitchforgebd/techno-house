import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Returns — Techno House",
};

export default function ReturnsPage() {
  return (
    <ContentStub
      heading="Returns"
      title="Returns and refunds"
      description="Returns information will appear here."
    />
  );
}
