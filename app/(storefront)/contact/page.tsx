import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Contact — Techno House",
};

export default function ContactPage() {
  return (
    <ContentStub
      heading="Contact"
      title="Get in touch"
      description="A contact form will appear here. Support hours are 9:00–22:00."
    />
  );
}
