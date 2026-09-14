import type { MetadataRoute } from "next";
import { publicOrigin } from "@/lib/seo/public-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/account/",
        "/dev/",
        "/checkout/",
        "/cart",
        "/wishlist",
        "/compare",
        "/search",
      ],
    },
    sitemap: `${publicOrigin()}/sitemap.xml`,
  };
}
