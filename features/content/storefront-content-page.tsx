import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";
import { JsonLd } from "@/components/seo/json-ld-script";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import { getStorefrontBranding } from "@/lib/business/storefront-branding";
import {
  getStorefrontContentPage,
  type ContentPageSlug,
} from "@/lib/content/pages";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";
import {
  breadcrumbListJsonLd,
  faqItemsFromHtml,
  faqPageJsonLd,
  webPageJsonLd,
} from "@/lib/seo/json-ld";
import { staticPageMetadata } from "@/lib/seo/page-metadata";
import {
  POLICIES,
  fillPolicyTokens,
  fillPolicyTokensText,
} from "@/lib/site/policies";

/**
 * Real content when Admin -> Design Studio -> Pages has saved something; the
 * original placeholder copy otherwise (an empty body counts as nothing saved,
 * and that path renders exactly what it did before SEO phase 6).
 *
 * Published bodies may hold `{{tokens}}` for the store's policy values
 * (lib/site/policies.ts) and `{{googleMapsUrl}}` (the Business Settings map
 * link). They are filled in BEFORE sanitizing, so inserted values go through
 * the same sanitizer as the rest of the body.
 */
export async function StorefrontContentPage({
  slug,
  fallbackHeading,
  fallbackTitle,
  fallbackDescription,
}: {
  slug: ContentPageSlug;
  fallbackHeading: string;
  fallbackTitle: string;
  fallbackDescription: string;
}) {
  const page = await getStorefrontContentPage(slug);
  if (!page) {
    return (
      <ContentStub
        heading={fallbackHeading}
        title={fallbackTitle}
        description={fallbackDescription}
      />
    );
  }
  const branding = await getStorefrontBranding();
  // The ElectronicsStore `hasMap` link; a maps search for the showroom
  // address only if Business Settings has none.
  const googleMapsUrl =
    branding.googleMapsUrl.trim() ||
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(POLICIES.showroomAddress)}`;
  const html = sanitizeBlogBody(fillPolicyTokens(page.body, { googleMapsUrl }));
  const path = `/${slug}`;
  const breadcrumbs: BreadcrumbItem[] = [
    { href: "/", label: "Home" },
    { label: page.title },
  ];
  const description = fillPolicyTokensText(page.customMetaDescription ?? "");
  const faqItems = slug === "faq" ? faqItemsFromHtml(html) : [];
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <JsonLd data={breadcrumbListJsonLd(breadcrumbs)} />
      {slug === "about" ? (
        <JsonLd data={webPageJsonLd("AboutPage", { path, name: page.title, description })} />
      ) : null}
      {slug === "contact" ? (
        <JsonLd data={webPageJsonLd("ContactPage", { path, name: page.title, description })} />
      ) : null}
      {faqItems.length > 0 ? <JsonLd data={faqPageJsonLd(faqItems)} /> : null}
      <div className="mb-4">
        <Breadcrumbs items={breadcrumbs} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div
        data-page-content={slug}
        className="th-rich-text mt-6 text-body text-text"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * Built-in title/description for each content page (SEO phase 2, B6 —
 * `STATIC_PAGE_META`), self-canonical at `/{slug}`, with the default OG
 * image. A meta title/description the admin actually typed in Admin →
 * Design Studio → Pages wins over the built-in copy. Policy `{{tokens}}` in
 * either are filled in.
 */
export async function storefrontContentMetadata(
  slug: ContentPageSlug,
): Promise<Metadata> {
  const page = await getStorefrontContentPage(slug);
  const custom = page?.customMetaTitle
    ? fillPolicyTokensText(page.customMetaTitle)
    : null;
  return staticPageMetadata(`/${slug}`, {
    title: custom
      ? /techno house/i.test(custom)
        ? custom
        : `${custom} | Techno House`
      : null,
    description: page?.customMetaDescription
      ? fillPolicyTokensText(page.customMetaDescription)
      : null,
  });
}
