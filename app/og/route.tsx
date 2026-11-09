import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { brandRepository, categoryRepository } from "@/lib/data";
import {
  SITE_NAME,
  STATIC_PAGE_META,
  brandMeta,
  categoryMeta,
  categoryParentQualifier,
} from "@/lib/seo/page-meta";

/**
 * Default 1200×630 Open Graph image for category, brand and static pages
 * (SEO phase 2, item 6): the site name plus the page's own heading.
 *
 *   /og?type=category&slug=laptop
 *   /og?type=brand&slug=asus
 *   /og?type=page&slug=warranty
 *
 * The text is looked up on the server from the slug — never taken from the
 * query string — so this cannot be used to render arbitrary text under our
 * domain. Unknown slugs 404.
 */
const OG_SIZE = { width: 1200, height: 630 } as const;

async function headingFor(type: string, slug: string): Promise<string | null> {
  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return null;
  }
  if (type === "category") {
    const category = await categoryRepository.getBySlug(slug);
    return category
      ? categoryMeta(
          category,
          undefined,
          categoryParentQualifier(category, await categoryRepository.list()),
        ).h1
      : null;
  }
  if (type === "brand") {
    const brand = await brandRepository.getBySlug(slug);
    if (!brand) {
      return null;
    }
    const h1 = brandMeta(brand, []).h1;
    return h1 === brand.name.trim() ? `${h1} Products in Bangladesh` : h1;
  }
  if (type === "page") {
    const meta = STATIC_PAGE_META[`/${slug}`];
    return meta ? meta.title.replace(/\s*\|\s*Techno House$/u, "") : null;
  }
  return null;
}

export async function GET(request: NextRequest): Promise<Response> {
  const type = request.nextUrl.searchParams.get("type") ?? "";
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  const heading = await headingFor(type, slug);
  if (!heading) {
    return new Response("Not found", { status: 404 });
  }
  const fontSize = heading.length > 44 ? 64 : heading.length > 28 ? 76 : 88;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #051c39 0%, #0b2f5e 60%, #0b5ed7 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 18,
              height: 56,
              borderRadius: 4,
              background: "#0a6cff",
              display: "flex",
            }}
          />
          <div
            style={{
              fontSize: 40,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            fontSize,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: -1,
            maxWidth: 1040,
            display: "flex",
          }}
        >
          {heading}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 30,
            color: "#e8f0fe",
          }}
        >
          <div style={{ display: "flex" }}>technohouse.com.bd</div>
          <div style={{ display: "flex" }}>Laptops · PC Parts · Gadgets</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    },
  );
}
