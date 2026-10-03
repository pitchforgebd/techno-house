import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("privacy", "Privacy — Techno House");
}

export default function PrivacyPage() {
  return (
    <StorefrontContentPage
      slug="privacy"
      fallbackHeading="Privacy"
      fallbackTitle="Privacy policy"
      fallbackDescription="The privacy policy will appear here. This page is a placeholder, not copied from another retailer."
    />
  );
}
