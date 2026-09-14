import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("shipping", "Shipping — Techno House");
}

export default function ShippingPage() {
  return (
    <StorefrontContentPage
      slug="shipping"
      fallbackHeading="Shipping"
      fallbackTitle="Shipping and delivery"
      fallbackDescription="Shipping information will appear here."
    />
  );
}
