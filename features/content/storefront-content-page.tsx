import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";
import {
  getStorefrontContentPage,
  type ContentPageSlug,
} from "@/lib/content/pages";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";
import { staticPageMetadata } from "@/lib/seo/page-metadata";

/** Real content when Admin -> Design Studio -> Pages has saved something; the original placeholder copy otherwise. */
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
  return (
    <div className="mx-auto max-w-content px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
      <div
        className="th-rich-text mt-6 text-body text-text"
        dangerouslySetInnerHTML={{ __html: sanitizeBlogBody(page.body) }}
      />
    </div>
  );
}

/**
 * Built-in title/description for each content page (SEO phase 2, B6 —
 * `STATIC_PAGE_META`), self-canonical at `/{slug}`, with the default OG
 * image. A meta title/description the admin actually typed in Admin →
 * Design Studio → Pages wins over the built-in copy.
 */
export async function storefrontContentMetadata(
  slug: ContentPageSlug,
): Promise<Metadata> {
  const page = await getStorefrontContentPage(slug);
  const custom = page?.customMetaTitle;
  return staticPageMetadata(`/${slug}`, {
    title: custom
      ? /techno house/i.test(custom)
        ? custom
        : `${custom} | Techno House`
      : null,
    description: page?.customMetaDescription,
  });
}
