import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("faq", "FAQ — Techno House");
}

export default function FaqPage() {
  return (
    <StorefrontContentPage
      slug="faq"
      fallbackHeading="FAQ"
      fallbackTitle="Frequently asked questions"
      fallbackDescription="Answers to common questions will appear here."
    />
  );
}
