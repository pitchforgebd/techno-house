import { JsonLd } from "@/components/seo/json-ld-script";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/json-ld";

/**
 * Sitewide Organization + WebSite (with a SearchAction, for the search box
 * sitelinks can show) JSON-LD. Mounted once in the storefront layout so it
 * appears on every public page without each one re-declaring it.
 */
export async function SiteJsonLd() {
  const branding = await getStorefrontBranding();
  return (
    <>
      <JsonLd data={organizationJsonLd(branding)} />
      <JsonLd data={websiteJsonLd(branding)} />
    </>
  );
}
