import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("warranty", "Warranty — Techno House");
}

export default function WarrantyPage() {
  return (
    <StorefrontContentPage
      slug="warranty"
      fallbackHeading="Warranty"
      fallbackTitle="Warranty information"
      fallbackDescription="Warranty terms will appear here."
    />
  );
}
