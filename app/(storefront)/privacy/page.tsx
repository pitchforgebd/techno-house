import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";

export const metadata: Metadata = {
  title: "Privacy — Techno House",
};

export default function PrivacyPage() {
  return (
    <ContentStub
      heading="Privacy"
      title="Privacy policy"
      description="The privacy policy will appear here."
    />
  );
}
