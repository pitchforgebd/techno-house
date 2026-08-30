import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Flash sale — Techno House",
};

export default function FlashSalePage() {
  return (
    <ContentStub
      heading="Flash sale"
      title="Flash sale"
      description="Timed flash-sale merchandising will appear here. Products stay browsable without a countdown."
    />
  );
}
