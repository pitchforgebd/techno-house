import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("returns", "Returns — Techno House");
}

export default function ReturnsPage() {
  return (
    <StorefrontContentPage
      slug="returns"
      fallbackHeading="Returns"
      fallbackTitle="Returns and refunds"
      fallbackDescription="Returns information will appear here."
    />
  );
}
