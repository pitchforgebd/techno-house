import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("terms", "Terms — Techno House");
}

export default function TermsPage() {
  return (
    <StorefrontContentPage
      slug="terms"
      fallbackHeading="Terms"
      fallbackTitle="Terms of use"
      fallbackDescription="The terms of use will appear here."
    />
  );
}
