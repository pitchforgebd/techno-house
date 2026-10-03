/**
 * JSON-LD (schema.org) builders. Every field here comes from real data
 * already loaded by the calling page — nothing here invents a rating,
 * review, price, or availability that isn't actually in the database.
 */
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs";
import type { StorefrontBranding } from "@/lib/business/storefront-branding";
import type { ProductDetail, StockStatus } from "@/lib/data";
import { canonicalUrl } from "@/lib/seo/canonical";

const AVAILABILITY: Record<StockStatus, string> = {
  in_stock: "https://schema.org/InStock",
  low_stock: "https://schema.org/LimitedAvailability",
  out_of_stock: "https://schema.org/OutOfStock",
};

export function organizationJsonLd(branding: StorefrontBranding) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: branding.storeName,
    url: canonicalUrl("/"),
    logo: branding.logoSrc ? canonicalUrl(branding.logoSrc) : undefined,
    telephone: branding.phone || undefined,
    email: branding.supportEmail || undefined,
    address:
      branding.address || branding.city
        ? {
            "@type": "PostalAddress",
            streetAddress: branding.address || undefined,
            addressLocality: branding.city || undefined,
            addressCountry: "BD",
          }
        : undefined,
  };
}

export function websiteJsonLd(branding: StorefrontBranding) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: branding.storeName,
    url: canonicalUrl("/"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${canonicalUrl("/search")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Mirrors whatever `BreadcrumbItem[]` is already rendered as the visible
 * `<Breadcrumbs>` trail — the schema and the on-page markup must agree, so
 * callers build one array and pass it to both rather than maintaining two.
 * The last (current-page) crumb has no `href`, matching Google's guidance
 * that the terminal item's `item` URL may be omitted.
 */
export function breadcrumbListJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? canonicalUrl(item.href) : undefined,
    })),
  };
}

export function productJsonLd({
  product,
  path,
  reviewCount,
  averageRating,
}: {
  product: ProductDetail;
  path: string;
  reviewCount: number;
  averageRating: number | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: [product.image.src, ...product.images.map((img) => img.src)].filter(
      (src, index, all) => src && all.indexOf(src) === index,
    ),
    description: product.overview[0]?.trim() || undefined,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brandName },
    offers: {
      "@type": "Offer",
      url: canonicalUrl(path),
      priceCurrency: product.price.currency,
      price: product.price.amount,
      availability: AVAILABILITY[product.stockStatus],
    },
    aggregateRating:
      reviewCount > 0 && averageRating != null
        ? {
            "@type": "AggregateRating",
            ratingValue: averageRating,
            reviewCount,
          }
        : undefined,
  };
}
