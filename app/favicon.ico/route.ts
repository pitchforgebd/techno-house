import { NextResponse } from "next/server";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";

/**
 * `/favicon.ico` (AD-369). Browsers ask for this address on their own — on every
 * page that has no <link rel="icon">, and on the "Page not found" page, which is
 * rendered outside the storefront layout — and it used to answer 404, which
 * showed up as a red error in every visitor's console. It now sends the browser
 * to the favicon (or, failing that, the logo) set in Admin -> Settings, and
 * answers an empty 204 when neither is set, so there is never a 404.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const branding = await getStorefrontBranding();
  const src = branding.faviconSrc || branding.logoSrc;
  if (src && src.startsWith("/") && !src.startsWith("//")) {
    return NextResponse.redirect(new URL(src, request.url), {
      status: 302,
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  }
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
