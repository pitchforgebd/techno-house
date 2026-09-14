import type { MetadataRoute } from "next";
import { absoluteSitemapUrl, listSitemapPaths } from "@/lib/seo/sitemap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = await listSitemapPaths();
  return paths.map((path) => ({
    url: absoluteSitemapUrl(path),
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.6,
  }));
}
