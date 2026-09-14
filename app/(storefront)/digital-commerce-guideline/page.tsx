import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata(
    "digital-commerce-guideline",
    "ডিজিটাল কমার্স নির্দেশিকা ২০২১ — Techno House",
  );
}

export default function DigitalCommerceGuidelinePage() {
  return (
    <StorefrontContentPage
      slug="digital-commerce-guideline"
      fallbackHeading="ডিজিটাল কমার্স নির্দেশিকা ২০২১"
      fallbackTitle="ডিজিটাল কমার্স পরিচালনা নির্দেশিকা ২০২১"
      fallbackDescription="বাণিজ্য মন্ত্রণালয় কর্তৃক জারিকৃত ডিজিটাল কমার্স পরিচালনা নির্দেশিকা ২০২১ এখানে প্রকাশ করা হবে।"
    />
  );
}
