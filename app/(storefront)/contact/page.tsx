import type { Metadata } from "next";
import { StoreJsonLd } from "@/components/seo/site-json-ld";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("contact");
}

export default function ContactPage() {
  return (
    <>
      {/* ElectronicsStore (SEO phase 3) — the shop's address, phone, hours. */}
      <StoreJsonLd />
      <StorefrontContentPage
        slug="contact"
        fallbackHeading="Contact"
        fallbackTitle="Get in touch"
        fallbackDescription="A contact form will appear here. Support hours are 9:00–22:00."
      />
    </>
  );
}
