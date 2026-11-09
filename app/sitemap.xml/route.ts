import { renderSitemapIndex, sitemapXmlResponse } from "@/lib/seo/sitemap";

// Sitemap index (SEO phase 1) — robots.txt points here. Rebuilt at most once
// an hour; each child sitemap below is cached the same way.
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return sitemapXmlResponse(await renderSitemapIndex());
}
