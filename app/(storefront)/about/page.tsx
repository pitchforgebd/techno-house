import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("about", "About — Techno House");
}

export default function AboutPage() {
  return (
    <StorefrontContentPage
      slug="about"
      fallbackHeading="About"
      fallbackTitle="About Techno House"
      fallbackDescription="Our story will appear here. This page is a placeholder, not copied from another retailer."
    />
  );
}
