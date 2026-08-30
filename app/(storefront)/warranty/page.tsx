import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Warranty — Techno House",
};

export default function WarrantyPage() {
  return (
    <ContentStub
      heading="Warranty"
      title="Warranty information"
      description="Warranty terms will appear here."
    />
  );
}
