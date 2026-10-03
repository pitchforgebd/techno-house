import type { MetadataRoute } from "next";
import { absoluteSitemapUrl, listSitemapEntries } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await listSitemapEntries();
  return entries.map((entry) => ({
    url: absoluteSitemapUrl(entry.path),
    lastModified: entry.lastModified,
    changeFrequency: entry.path === "/" ? "daily" : "weekly",
    priority: entry.path === "/" ? 1 : 0.6,
  }));
}
