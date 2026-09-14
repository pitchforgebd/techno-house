import type { Metadata } from "next";
import { HomePage } from "@/features/home/home-page";
import { getStorefrontSeoMetadata } from "@/lib/seo/config";

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getStorefrontSeoMetadata();
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  };
}

export default function Home() {
  return <HomePage />;
}
