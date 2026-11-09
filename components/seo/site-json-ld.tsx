import { JsonLd } from "@/components/seo/json-ld-script";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";
import { getFooterWidgetsConfig } from "@/lib/content/footer-settings";
import {
  electronicsStoreJsonLd,
  organizationJsonLd,
  sameAsLinks,
  websiteJsonLd,
} from "@/lib/seo/json-ld";

/**
 * Sitewide Organization + WebSite (with a SearchAction, for the search box
 * sitelinks can show) JSON-LD. Mounted once in the storefront layout so it
 * appears on every public page without each one re-declaring it.
 * `sameAs` = the social profiles the footer links to (only real https URLs).
 */
export async function SiteJsonLd() {
  const [branding, footer] = await Promise.all([
    getStorefrontBranding(),
    getFooterWidgetsConfig(),
  ]);
  const sameAs = footer.showSocial ? sameAsLinks(footer.socialLinks) : [];
  return (
    <>
      <JsonLd data={organizationJsonLd(branding, { sameAs })} />
      <JsonLd data={websiteJsonLd(branding)} />
    </>
  );
}

/**
 * The physical shop as an ElectronicsStore (SEO phase 3, C6) — home and
 * contact pages only. Address, phone and map link are the values the footer
 * already shows, plus the shop's coordinates. No opening hours — see
 * `electronicsStoreJsonLd`.
 */
export async function StoreJsonLd() {
  const [branding, footer] = await Promise.all([
    getStorefrontBranding(),
    getFooterWidgetsConfig(),
  ]);
  const sameAs = footer.showSocial ? sameAsLinks(footer.socialLinks) : [];
  return <JsonLd data={electronicsStoreJsonLd(branding, { sameAs })} />;
}
