import { NextResponse } from "next/server";
import { renderFacebookCatalogFeed } from "@/lib/analytics/feeds";

export async function GET() {
  const xml = await renderFacebookCatalogFeed();
  if (!xml) {
    return new NextResponse(null, { status: 404 });
  }
  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
