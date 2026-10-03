import type { Metadata } from "next";
import { HomePage } from "@/features/home/home-page";
import { canonicalUrl } from "@/lib/seo/canonical";
import { getStorefrontSeoMetadata } from "@/lib/seo/config";

// No dynamic route segment here, so nothing 404s without this — but without
// it the page is fully static from build time, so an Admin-edited hero
// banner or home section would otherwise need a manual rebuild to appear.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getStorefrontSeoMetadata();
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: canonicalUrl("/") },
  };
}

export default function Home() {
  return <HomePage />;
}
