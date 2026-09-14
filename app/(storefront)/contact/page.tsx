import type { Metadata } from "next";
import {
  StorefrontContentPage,
  storefrontContentMetadata,
} from "@/features/content/storefront-content-page";

export async function generateMetadata(): Promise<Metadata> {
  return storefrontContentMetadata("contact", "Contact — Techno House");
}

export default function ContactPage() {
  return (
    <StorefrontContentPage
      slug="contact"
      fallbackHeading="Contact"
      fallbackTitle="Get in touch"
      fallbackDescription="A contact form will appear here. Support hours are 9:00–22:00."
    />
  );
}
