import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Shipping — Techno House",
};

export default function ShippingPage() {
  return (
    <ContentStub
      heading="Shipping"
      title="Shipping and delivery"
      description="Shipping information will appear here."
    />
  );
}
