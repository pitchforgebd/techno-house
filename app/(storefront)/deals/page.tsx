import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Deals — Techno House",
};

export default function DealsPage() {
  return (
    <ContentStub
      heading="Deals"
      title="Current deals"
      description="A full deals listing will appear here. Sale prices on the homepage are for display only."
    />
  );
}
