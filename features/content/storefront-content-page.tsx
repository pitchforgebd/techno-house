import type { Metadata } from "next";
import { ContentStub } from "@/components/layout/content-stub";
import {
  getStorefrontContentPage,
  type ContentPageSlug,
} from "@/lib/content/pages";
import { sanitizeBlogBody } from "@/lib/content/sanitize-html";

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

export async function storefrontContentMetadata(
  slug: ContentPageSlug,
  fallbackTitle: string,
): Promise<Metadata> {
  const page = await getStorefrontContentPage(slug);
  if (!page) {
    return { title: fallbackTitle };
  }
  return {
    title: `${page.metaTitle} — Techno House`,
    description: page.metaDescription || undefined,
  };
}
