import {
  listSitemapSection,
  renderUrlset,
  sitemapXmlResponse,
} from "@/lib/seo/sitemap";

// Child of the /sitemap.xml index (SEO phase 1).
export const revalidate = 3600;

export async function GET(): Promise<Response> {
  return sitemapXmlResponse(renderUrlset(await listSitemapSection("blog")));
}
